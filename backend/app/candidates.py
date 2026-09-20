"""Deterministic evidence-clue candidate discovery.

Scores: exact clue match = 100 points, +10 per additional matching record,
+5 per distinct source after the first. Ties sort by score descending,
matching-record count descending, entity type, then normalized entity value.
"""

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from decimal import Decimal
import ipaddress

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.case import Case
from app.models.datasets import BankingRecord, CdrRecord, EvidenceRecordRow, IpdrRecord, ReportRecord
from app.store import normalize_entity_value, store, to_utc


class CandidateError(ValueError):
    pass


def _parse_amount_time(value: str) -> tuple[Decimal, datetime]:
    amount_text, timestamp_text = value.split("|", 1)
    return Decimal(amount_text), datetime.fromisoformat(timestamp_text.replace("Z", "+00:00"))


def _candidate(entity_type: str, value: str, records: list, reasons: list[str], source_names: set[str]) -> dict:
    normalized = normalize_entity_value(entity_type, value)
    return {
        "entity": {"id": f"{entity_type}:{normalized}", "type": entity_type, "value": value, "label": value},
        "score": 100 + max(0, len(records) - 1) * 10 + max(0, len(source_names) - 1) * 5,
        "reasons": sorted(set(reasons)),
        "matching_record_ids": sorted({record.id for record in records}),
        "matching_evidence_ids": sorted({store._evidence_id(record.id) for record in records}),
        "_sources": source_names,
    }


def _sort(candidates: list[dict]) -> list[dict]:
    ordered = sorted(candidates, key=lambda item: (-item["score"], -len(item["matching_record_ids"]), item["entity"]["type"], normalize_entity_value(item["entity"]["type"], item["entity"]["value"])))
    for item in ordered:
        item.pop("_sources", None)
    return ordered


async def discover_candidates(case: Case, db: AsyncSession) -> dict:
    clue_type = case.clue_type
    clue_value = case.clue_value
    if not clue_type or not clue_value:
        return {"clue": {"type": clue_type, "value": clue_value}, "reason": "This legacy evidence case has no stored clue.", "candidates": []}

    cdr = list(await db.scalars(select(CdrRecord).where(CdrRecord.case_id == case.id)))
    ipdr = list(await db.scalars(select(IpdrRecord).where(IpdrRecord.case_id == case.id)))
    banking = list(await db.scalars(select(BankingRecord).where(BankingRecord.case_id == case.id)))
    reports = list(await db.scalars(select(ReportRecord).where(ReportRecord.case_id == case.id)))
    matches: dict[str, dict] = {}

    def add(entity_type: str, value: str, record, reason: str, source: str) -> None:
        normalized = normalize_entity_value(entity_type, value)
        key = f"{entity_type}:{normalized}"
        item = matches.setdefault(key, {"type": entity_type, "value": value, "records": [], "reasons": [], "sources": set()})
        item["records"].append(record)
        item["reasons"].append(reason)
        item["sources"].add(source)

    if clue_type == "phone":
        target = normalize_entity_value("phone", clue_value)
        for record in cdr:
            endpoints = [(record.caller, "Phone appears as a CDR caller"), (record.callee, "Phone appears as a CDR callee")]
            if any(normalize_entity_value("phone", value) == target for value, _ in endpoints):
                add("phone", clue_value, record, "Phone appears in a matching CDR", "CDR")
        for record in reports:
            for entity in record.extracted_entities or []:
                if entity.get("type") == "phone" and normalize_entity_value("phone", entity.get("value", "")) == target:
                    add("phone", entity["value"], record, "Phone appears in a matching report", "Report")
    elif clue_type == "ip":
        target = str(ipaddress.ip_address(clue_value))
        for record in ipdr:
            if target in {str(ipaddress.ip_address(record.source_ip)), str(ipaddress.ip_address(record.destination_ip))}:
                add("ip", clue_value, record, "IP appears in a matching IPDR", "IPDR")
        for record in reports:
            for entity in record.extracted_entities or []:
                if entity.get("type") == "ip":
                    try:
                        if str(ipaddress.ip_address(entity.get("value", ""))) == target:
                            add("ip", entity["value"], record, "IP appears in a matching report", "Report")
                    except ValueError:
                        continue
    elif clue_type in {"transaction_id", "upi_ref"}:
        keys = ("transaction_id",) if clue_type == "transaction_id" else ("upi_ref", "upi_reference")
        for record in banking:
            if any(record.attributes.get(key) == clue_value for key in keys):
                add("bank_account", record.sender, record, "Sender is party to the matching transaction", "Banking")
                add("bank_account", record.recipient, record, "Recipient is party to the matching transaction", "Banking")
    elif clue_type == "amount_time":
        amount, target_time = _parse_amount_time(clue_value)
        for record in banking:
            if Decimal(str(record.amount)) == amount and abs(to_utc(record.timestamp) - to_utc(target_time)) <= timedelta(minutes=5):
                add("bank_account", record.sender, record, "Same amount within 5 minutes", "Banking")
                add("bank_account", record.recipient, record, "Same amount within 5 minutes", "Banking")

    candidates = [_candidate(item["type"], item["value"], item["records"], item["reasons"], item["sources"]) for item in matches.values()]
    matched_records = {record.id: record for item in matches.values() for record in item["records"]}
    if matched_records:
        await store._ensure_provenance(db, case.id, list(matched_records.values()), "candidate_discovery")
    if clue_type in {"phone", "ip"} and candidates:
        counterparties: Counter[str] = Counter()
        for record in cdr if clue_type == "phone" else ipdr:
            values = (record.caller, record.callee) if clue_type == "phone" else (record.source_ip, record.destination_ip)
            clue_in_record = any(normalize_entity_value(clue_type, value) == normalize_entity_value(clue_type, clue_value) for value in values)
            if clue_in_record:
                for value in values:
                    if normalize_entity_value(clue_type, value) != normalize_entity_value(clue_type, clue_value):
                        counterparties[value] += 1
        for value, count in counterparties.items():
            interaction_records = [
                record
                for record in (cdr if clue_type == "phone" else ipdr)
                if value in ((record.caller, record.callee) if clue_type == "phone" else (record.source_ip, record.destination_ip))
                and normalize_entity_value(clue_type, clue_value) in {
                    normalize_entity_value(clue_type, endpoint)
                    for endpoint in ((record.caller, record.callee) if clue_type == "phone" else (record.source_ip, record.destination_ip))
                }
            ]
            candidates.append(_candidate(clue_type, value, interaction_records, [f"Counterparty interacted {count} time(s)"], {"CDR" if clue_type == "phone" else "IPDR"}))
    result = {"clue": {"type": clue_type, "value": clue_value}, "candidates": _sort(candidates)}
    if not candidates and clue_type in {"transaction_id", "upi_ref"}:
        result["reason"] = "No stored allowlisted transaction or UPI reference matched this clue."
    return result


async def confirm_candidate(case: Case, candidate_id: str, db: AsyncSession) -> dict:
    result = await discover_candidates(case, db)
    candidate = next((item for item in result["candidates"] if item["entity"]["id"] == candidate_id), None)
    if candidate is None:
        raise CandidateError("Candidate is not a current match for this case clue.")
    entity_type = candidate["entity"]["type"]
    seed_type = "bank_account" if entity_type == "bank_account" else entity_type
    case.seed_type = seed_type
    case.seed_value = candidate["entity"]["value"]
    db.add(case)
    db.add(__import__("app.models.audit", fromlist=["AuditLogEntry"]).AuditLogEntry(
        case_id=case.id,
        user="system",
        action="evidence_candidate_confirmed",
        entity_type="case_seed",
        entity_id=candidate_id,
        details={"clue": result["clue"], "matching_record_ids": candidate["matching_record_ids"], "matching_evidence_ids": candidate["matching_evidence_ids"]},
    ))
    await db.commit()
    return candidate
