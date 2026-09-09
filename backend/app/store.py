# backend/app/store.py
import asyncio
from app.seed import cases, active_case, entities, edges, evidence, evidence_by_id, timeline, story_claims, copilot_seed, alerts, weekly_activity
from datetime import timedelta
import hashlib
import json
import os
import re
import urllib.error
import urllib.request
from fastapi import HTTPException
from app.models import GraphResponse, TimelineEvent, EvidenceRecord, Entity, GraphEdge
from app.models.case import Case
from app.models.datasets import BankingRecord, CdrRecord, EvidenceRecordRow, IpdrRecord, ReportRecord, SocialRecord
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import FinancialFlowResponse, FinancialFlowNode, FinancialFlowLink
from app.models import CopilotMessage, StoryClaim

class DataStore:
    def __init__(self):
        self.cases = cases
        self.active_case = active_case
        self.entities = entities
        self.edges = edges
        self.evidence = evidence
        self.evidence_by_id = evidence_by_id
        self.timeline = timeline
        self.story_claims = story_claims
        self.copilot_seed = copilot_seed
        self.alerts = alerts
        self.weekly_activity = weekly_activity

    @staticmethod
    def _evidence_id(record_id: str) -> str:
        return f"ev_{record_id}"

    async def _ensure_provenance(self, db: AsyncSession, case_id: str, rows: list, transformation: str) -> dict[str, str]:
        ids = [self._evidence_id(row.id) for row in rows]
        existing_rows = list(await db.scalars(select(EvidenceRecordRow).where(EvidenceRecordRow.id.in_(ids))))
        existing = {row.id for row in existing_rows}
        changed = False
        for record in existing_rows:
            if transformation not in record.transformation.split(","):
                record.transformation = f"{record.transformation},{transformation}"
                changed = True
        for row in rows:
            evidence_id = self._evidence_id(row.id)
            if evidence_id in existing:
                continue
            if isinstance(row, CdrRecord):
                source, fields, rule = "CDR", {"caller": row.caller, "callee": row.callee, "durationSeconds": row.duration_seconds}, "SHARED_IDENTITY_PHONE" if row.attributes.get("identity_id") else "CALL_RELATIONSHIP"
            elif isinstance(row, IpdrRecord):
                source, fields, rule = "IPDR", {"sourceIp": row.source_ip, "destinationIp": row.destination_ip, "protocol": row.protocol}, "SHARED_IP_IDENTITIES" if row.attributes.get("identity_id") else "IP_CONNECTION"
            elif isinstance(row, BankingRecord):
                source, fields, rule = "Banking", {"sender": row.sender, "recipient": row.recipient, "amount": float(row.amount), "channel": row.channel}, "HIGH_VALUE_TRANSACTION" if float(row.amount) >= 10000 else "BANKING_TRANSACTION"
            else:
                source, fields, rule = "Social", {"actor": row.actor, "target": row.target, "platform": row.platform, "interaction": row.interaction}, "CLOSED_SOCIAL_LOOP"
            canonical = json.dumps({"source": source, "recordId": row.id, "fields": fields, "rule": rule}, sort_keys=True)
            db.add(EvidenceRecordRow(id=evidence_id, case_id=case_id, source=source, source_record_id=row.id, rule=rule, transformation=transformation, content_hash=hashlib.sha256(canonical.encode()).hexdigest(), fields=fields, timestamp=row.timestamp))
        if len(existing) != len(ids) or changed:
            await db.commit()
        return {row.id: self._evidence_id(row.id) for row in rows}

    async def fraud_analysis(self, case_id: str, db: AsyncSession) -> dict:
        def scope(query, model):
            return query if case_id == "*" else query.where(model.case_id == case_id)
        cdr = list(await db.scalars(scope(select(CdrRecord), CdrRecord)))
        ipdr = list(await db.scalars(scope(select(IpdrRecord), IpdrRecord)))
        banking = list(await db.scalars(scope(select(BankingRecord), BankingRecord)))
        social = list(await db.scalars(scope(select(SocialRecord), SocialRecord)))
        identity_phones: dict[str, set[str]] = {}
        for row in cdr:
            identity = row.attributes.get("identity_id")
            if identity:
                identity_phones.setdefault(identity, set()).update((row.caller, row.callee))
        shared_identity_count = sum(len(numbers) > 1 for numbers in identity_phones.values())
        ip_identities: dict[str, set[str]] = {}
        for row in ipdr:
            identity = row.attributes.get("identity_id")
            if identity:
                ip_identities.setdefault(row.source_ip, set()).add(identity)
                ip_identities.setdefault(row.destination_ip, set()).add(identity)
        shared_ip_count = sum(len(identities) > 1 for identities in ip_identities.values())
        high_value = [row for row in banking if float(row.amount) >= 10000]
        rapid = sum(
            any(other.id != current.id and other.sender == current.sender and abs(other.timestamp - current.timestamp) <= timedelta(minutes=30) for other in banking)
            for current in banking
        )
        social_links = {(row.actor, row.target) for row in social}
        closed_loops = sum((target, actor) in social_links for actor, target in social_links)
        flagged = len(high_value) + rapid
        suspicious = shared_identity_count + shared_ip_count + len({row.sender for row in high_value})
        return {
            "suspiciousEntitiesCount": suspicious,
            "flaggedTransactionsCount": flagged,
            "anomalyEventsCount": suspicious + flagged + closed_loops,
            "sharedIdentityPhoneGroups": shared_identity_count,
            "sharedIpGroups": shared_ip_count,
            "closedSocialLoops": closed_loops,
        }

    async def risk_factors_for_case(self, case_id: str, db: AsyncSession) -> dict:
        if await db.get(Case, case_id) is None:
            raise HTTPException(status_code=404, detail="Case not found.")

        cdr = list(await db.scalars(select(CdrRecord).where(CdrRecord.case_id == case_id)))
        ipdr = list(await db.scalars(select(IpdrRecord).where(IpdrRecord.case_id == case_id)))
        banking = list(await db.scalars(select(BankingRecord).where(BankingRecord.case_id == case_id)))
        social = list(await db.scalars(select(SocialRecord).where(SocialRecord.case_id == case_id)))
        records = cdr + ipdr + banking + social

        incoming: dict[tuple[str, str], set[tuple[str, str]]] = {}
        activity: dict[tuple[str, str], list] = {}
        locations: dict[tuple[float, float], list[tuple[object, tuple[str, str]]]] = {}
        devices: dict[str, set[tuple[str, str]]] = {}

        def add_relationship(dataset: str, source: str, target: str, timestamp, attributes: dict) -> None:
            source_id = (dataset, source)
            target_id = (dataset, target)
            incoming.setdefault(target_id, set()).add(source_id)
            activity.setdefault(source_id, []).append(timestamp)
            activity.setdefault(target_id, []).append(timestamp)
            latitude = attributes.get("latitude")
            longitude = attributes.get("longitude")
            if latitude is not None and longitude is not None:
                try:
                    location = (round(float(latitude), 4), round(float(longitude), 4))
                    locations.setdefault(location, []).append((timestamp, source_id))
                    locations.setdefault(location, []).append((timestamp, target_id))
                except (TypeError, ValueError):
                    pass
            for key in ("imei", "device_id"):
                device_id = attributes.get(key)
                if device_id:
                    devices.setdefault(str(device_id), set()).update((source_id, target_id))

        for row in cdr:
            add_relationship("cdr", row.caller, row.callee, row.timestamp, row.attributes or {})
        for row in ipdr:
            add_relationship("ipdr", row.source_ip, row.destination_ip, row.timestamp, row.attributes or {})
        for row in banking:
            add_relationship("banking", row.sender, row.recipient, row.timestamp, row.attributes or {})
        for row in social:
            add_relationship("social", row.actor, row.target, row.timestamp, row.attributes or {})

        factors = []
        positive_fan_in = [len(counterparties) for counterparties in incoming.values() if counterparties]
        average_incoming = sum(positive_fan_in) / len(positive_fan_in) if positive_fan_in else 0
        factors.append({
            "label": "Fan-in severity",
            "score": round(min(100, average_incoming / 10 * 100)),
        })

        reactivated = 0
        for timestamps in activity.values():
            ordered = sorted(timestamps)
            if any(ordered[index + 1] - ordered[index] >= timedelta(hours=24) for index in range(len(ordered) - 1)):
                reactivated += 1
        active_entities = len(activity)
        factors.append({
            "label": "Dormant reactivation",
            "score": round(reactivated / active_entities * 100) if active_entities else 0,
        })

        location_score = 0
        for entries in locations.values():
            entries.sort(key=lambda item: item[0])
            for index, (timestamp, _) in enumerate(entries):
                participants = {
                    entity
                    for other_timestamp, entity in entries[index:]
                    if other_timestamp - timestamp <= timedelta(minutes=30)
                }
                location_score = max(location_score, min(100, (len(participants) - 1) / 4 * 100))
        if locations:
            factors.append({"label": "Location co-occurrence", "score": round(location_score)})

        if devices:
            max_shared = max(len(shared_entities) for shared_entities in devices.values())
            factors.append({
                "label": "Device sharing",
                "score": round(min(100, (max_shared - 1) / 4 * 100)),
            })

        if social:
            social_activity = sorted((row.timestamp, row.actor) for row in social)
            max_synchronized = 1
            for index, (timestamp, _) in enumerate(social_activity):
                actors = {
                    actor
                    for other_timestamp, actor in social_activity[index:]
                    if other_timestamp - timestamp <= timedelta(minutes=15)
                }
                max_synchronized = max(max_synchronized, len(actors))
            factors.append({
                "label": "Coordinated messaging",
                "score": round(min(100, (max_synchronized - 1) / 4 * 100)),
            })

        return {"riskFactors": factors}

    async def provenance_for_claim(self, claim_id: str, db: AsyncSession) -> dict:
        claim = next((item for item in self.story_claims if item.id == claim_id), None)
        requested_ids = claim.evidenceIds if claim else [claim_id]
        records = list(await db.scalars(select(EvidenceRecordRow).where(EvidenceRecordRow.id.in_(requested_ids))))
        if not records and claim:
            records = list(await db.scalars(select(EvidenceRecordRow).where(EvidenceRecordRow.source_record_id.in_(requested_ids))))
        chains = [
            {
                "evidenceId": record.id,
                "sourceDataset": record.source,
                "sourceRecordId": record.source_record_id,
                "sourceRow": record.fields,
                "ruleApplied": record.rule,
                "transformation": record.transformation,
                "hash": record.content_hash,
                "verified": bool(record.content_hash),
            }
            for record in records
        ]
        return {
            "claimId": claim_id,
            "claim": claim.text if claim else None,
            "valid": bool(chains) and (claim is None or len(chains) == len(requested_ids)),
            "evidenceIds": [item["evidenceId"] for item in chains],
            "derivationChain": chains,
        }

    @staticmethod
    def _validate_narrative(narrative: str, valid_ids: set[str]) -> dict:
        sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", narrative.strip()) if part.strip()]
        citation_pattern = re.compile(r"\[([A-Za-z0-9_.-]+)\]")
        uncited = []
        claims = []
        for index, sentence in enumerate(sentences, start=1):
            cited = [item for item in citation_pattern.findall(sentence) if item in valid_ids]
            valid = bool(cited)
            if not valid:
                uncited.append(sentence)
            claims.append({
                "id": f"narrative_{index}",
                "text": sentence,
                "evidenceId": cited[0] if cited else None,
                "evidenceIds": cited,
                "valid": valid,
                "uncitedSentences": [] if valid else [sentence],
            })
        return {
            "narrative": narrative,
            "claims": claims,
            "uncitedSentences": uncited,
            "provenanceVerified": bool(sentences) and not uncited,
        }

    async def _llm_narrative(self, bundle: list[dict]) -> tuple[str | None, str]:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return None, "deterministic-evidence-bundle"
        prompt = (
            "Only narrate the given evidence. Cite one or more exact evidence_id values "
            "in square brackets per sentence. Do not add facts.\n\n"
            + json.dumps(bundle, sort_keys=True)
        )
        payload = json.dumps({
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            "temperature": 0,
            "messages": [
                {"role": "system", "content": "Only narrate given evidence, cite evidence_id per sentence."},
                {"role": "user", "content": prompt},
            ],
        }).encode()
        request = urllib.request.Request(
            os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1/chat/completions"),
            data=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            response = await asyncio.to_thread(urllib.request.urlopen, request, timeout=20)
            data = json.loads(response.read().decode())
            text = data["choices"][0]["message"]["content"]
            if not isinstance(text, str) or not text.strip():
                raise ValueError("LLM returned an empty narrative.")
            return text.strip(), "openai"
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as error:
            return None, f"llm-error-fallback:{type(error).__name__}"

    async def story_claims_for_case(self, case_id: str, db: AsyncSession) -> dict:
        if await db.get(Case, case_id) is None:
            raise HTTPException(status_code=404, detail="Case not found.")
        cdr = list(await db.scalars(select(CdrRecord).where(CdrRecord.case_id == case_id)))
        ipdr = list(await db.scalars(select(IpdrRecord).where(IpdrRecord.case_id == case_id)))
        banking = list(await db.scalars(select(BankingRecord).where(BankingRecord.case_id == case_id)))
        social = list(await db.scalars(select(SocialRecord).where(SocialRecord.case_id == case_id)))
        rows = cdr + ipdr + banking + social
        evidence_ids = await self._ensure_provenance(db, case_id, rows, "story_narrative")
        valid_ids = set(evidence_ids.values())
        bundle = []
        for row in sorted(rows, key=lambda item: item.timestamp):
            evidence_id = evidence_ids[row.id]
            if isinstance(row, CdrRecord):
                fields = {"caller": row.caller, "callee": row.callee, "durationSeconds": row.duration_seconds}
            elif isinstance(row, IpdrRecord):
                fields = {"sourceIp": row.source_ip, "destinationIp": row.destination_ip, "protocol": row.protocol}
            elif isinstance(row, BankingRecord):
                fields = {"sender": row.sender, "recipient": row.recipient, "amount": float(row.amount), "channel": row.channel}
            else:
                fields = {"actor": row.actor, "target": row.target, "platform": row.platform, "interaction": row.interaction}
            bundle.append({"evidence_id": evidence_id, "timestamp": row.timestamp.isoformat(), "fields": fields})
        narrative, provider = await self._llm_narrative(bundle)
        if narrative is None:
            sentences = []
            for item in bundle:
                fields = item["fields"]
                if "caller" in fields:
                    text = f"{fields['caller']} called {fields['callee']} for {fields['durationSeconds']} seconds"
                elif "sourceIp" in fields:
                    text = f"Network traffic connected {fields['sourceIp']} to {fields['destinationIp']} using {fields['protocol']}"
                elif "sender" in fields:
                    text = f"{fields['sender']} transferred {fields['amount']:.2f} to {fields['recipient']} via {fields['channel']}"
                else:
                    text = f"{fields['actor']} created a {fields['interaction']} relationship with {fields['target']} on {fields['platform']}"
                sentences.append(f"{text} [{item['evidence_id']}].")
            narrative = " ".join(sentences)
        validated = self._validate_narrative(narrative, valid_ids)
        validated["caseId"] = case_id
        validated["prompt"] = "Only narrate given evidence, cite evidence_id per sentence."
        validated["provider"] = provider
        for claim in validated["claims"]:
            if claim["evidenceIds"]:
                claim["id"] = claim["evidenceIds"][0]
                claim["evidenceId"] = claim["evidenceIds"][0]
            claim["confidence"] = "high"
            claim["provenance"] = [
                await self.provenance_for_claim(evidence_id, db)
                for evidence_id in claim["evidenceIds"]
            ]
        return validated

    async def graph_for_case(self, case_id: str, db: AsyncSession | None = None) -> GraphResponse:
        if db:
            cdr = list(await db.scalars(select(CdrRecord).where(CdrRecord.case_id == case_id)))
            ipdr = list(await db.scalars(select(IpdrRecord).where(IpdrRecord.case_id == case_id)))
            banking = list(await db.scalars(select(BankingRecord).where(BankingRecord.case_id == case_id)))
            social = list(await db.scalars(select(SocialRecord).where(SocialRecord.case_id == case_id)))
            reports = list(await db.scalars(select(ReportRecord).where(ReportRecord.case_id == case_id)))
            if cdr or ipdr or social or banking or reports:
                evidence_ids = await self._ensure_provenance(db, case_id, cdr + ipdr + banking + social, "graph_edge")
                entities = {}
                edges = []
                identity_phones = {}
                for item in cdr:
                    identity = item.attributes.get("identity_id")
                    if identity:
                        identity_phones.setdefault(identity, set()).update((item.caller, item.callee))
                shared_identities = {identity for identity, phones in identity_phones.items() if len(phones) > 1}
                ip_identities = {}
                for item in ipdr:
                    identity = item.attributes.get("identity_id")
                    if identity:
                        ip_identities.setdefault(item.source_ip, set()).add(identity)
                        ip_identities.setdefault(item.destination_ip, set()).add(identity)
                shared_ips = {ip for ip, identities_for_ip in ip_identities.items() if len(identities_for_ip) > 1}
                social_links = {(item.actor, item.target) for item in social}
                def add_entity(entity_id, entity_type, label):
                    entities.setdefault(entity_id, Entity(id=entity_id, type=entity_type, label=label, risk=0, confidence="high", tags=[]))
                for row in cdr:
                    add_entity(row.caller, "phone", row.caller); add_entity(row.callee, "phone", row.callee)
                    edges.append(GraphEdge(id=row.id, source=row.caller, target=row.callee, kind="CALLED", confidence="high", weight=3 if row.attributes.get("identity_id") in shared_identities else 1, evidenceId=evidence_ids[row.id], evidenceIds=[evidence_ids[row.id]]))
                for row in ipdr:
                    add_entity(row.source_ip, "ip", row.source_ip); add_entity(row.destination_ip, "ip", row.destination_ip)
                    edges.append(GraphEdge(id=row.id, source=row.source_ip, target=row.destination_ip, kind="MESSAGED", confidence="high", weight=3 if row.source_ip in shared_ips or row.destination_ip in shared_ips else 1, evidenceId=evidence_ids[row.id], evidenceIds=[evidence_ids[row.id]]))
                for row in banking:
                    sender_id, recipient_id = f"account:{row.sender}", f"account:{row.recipient}"
                    add_entity(sender_id, "account", row.sender); add_entity(recipient_id, "account", row.recipient)
                    edges.append(GraphEdge(id=row.id, source=sender_id, target=recipient_id, kind="TRANSFERRED_TO", confidence="high", weight=1, evidenceId=evidence_ids[row.id], evidenceIds=[evidence_ids[row.id]]))
                for row in social:
                    add_entity(row.actor, "social", row.actor); add_entity(row.target, "social", row.target)
                    edges.append(GraphEdge(id=row.id, source=row.actor, target=row.target, kind="MENTIONED", confidence="high", weight=3 if (row.target, row.actor) in social_links else 1, evidenceId=evidence_ids[row.id], evidenceIds=[evidence_ids[row.id]]))
                for report in reports:
                    for extracted in report.extracted_entities:
                        entity_type = extracted.get("type")
                        value = extracted.get("value")
                        if entity_type not in {"person", "phone", "ip", "location", "vehicle"} or not value:
                            continue
                        entity_id = value if entity_type in {"phone", "ip"} else f"{entity_type}:{value}"
                        add_entity(entity_id, entity_type, value)
                return GraphResponse(entities=list(entities.values()), edges=edges, fraudMetrics=await self.fraud_analysis(case_id, db))
        case_ids = {case.id for case in self.cases}
        ents = list(self.entities) if case_id in case_ids else []
        eds = list(self.edges) if case_id in case_ids else []
        return GraphResponse(entities=ents, edges=eds)

    async def timeline_for_case(self, case_id: str, db: AsyncSession | None = None) -> list[TimelineEvent]:
        if db:
            rows = list(await db.scalars(select(CdrRecord).where(CdrRecord.case_id == case_id))) + list(await db.scalars(select(BankingRecord).where(BankingRecord.case_id == case_id))) + list(await db.scalars(select(SocialRecord).where(SocialRecord.case_id == case_id)))
            if rows:
                evidence_ids = await self._ensure_provenance(db, case_id, rows, "timeline_event")
                calls = [row for row in rows if isinstance(row, CdrRecord)]
                short_call_ids = {row.id for row in calls if any(other.id != row.id and abs(other.timestamp - row.timestamp) <= timedelta(minutes=30) for other in calls)}
                return sorted([
                    TimelineEvent(id=row.id, timestamp=row.timestamp.isoformat(), title="Call record" if isinstance(row, CdrRecord) else "Banking transaction" if isinstance(row, BankingRecord) else "Social link", description=(f"{row.caller} called {row.callee}" if isinstance(row, CdrRecord) else f"{row.sender} transferred {row.amount} to {row.recipient} via {row.channel}" if isinstance(row, BankingRecord) else f"{row.actor} {row.interaction}d {row.target} on {row.platform}"), source="CDR" if isinstance(row, CdrRecord) else "Banking" if isinstance(row, BankingRecord) else "Social", entityIds=[], evidenceId=evidence_ids[row.id], evidenceIds=[evidence_ids[row.id]], severity=("high" if isinstance(row, BankingRecord) and float(row.amount) >= 10000 else "medium" if isinstance(row, CdrRecord) and row.id in short_call_ids else "low" if isinstance(row, SocialRecord) else "info"))
                    for row in rows
                ], key=lambda event: event.timestamp)
        case_ids = {case.id for case in self.cases}
        return sorted(
            (t for t in self.timeline if case_id in case_ids),
            key=lambda event: event.timestamp,
        )

    def evidence_by_id_lookup(self, evidence_id: str) -> EvidenceRecord | None:
        return self.evidence_by_id.get(evidence_id)

    async def evidence_for_case(self, case_id: str, db: AsyncSession) -> list[EvidenceRecord]:
        if await db.get(Case, case_id) is None:
            raise HTTPException(status_code=404, detail="Case not found.")
        rows = list(await db.scalars(select(EvidenceRecordRow).where(EvidenceRecordRow.case_id == case_id)))
        return [EvidenceRecord(
            id=row.id, source=row.source, summary=f"{row.source} record {row.source_record_id}",
            timestamp=row.timestamp.isoformat(), hash=row.content_hash,
            ingested=row.timestamp.isoformat(), fields=row.fields, ruleTriggered=row.rule,
        ) for row in rows]

    async def overview_for_case(self, case_id: str, db: AsyncSession) -> dict:
        case = await db.get(Case, case_id)
        if case is None:
            raise HTTPException(status_code=404, detail="Case not found.")
        dataset_rows = []
        for model in (CdrRecord, IpdrRecord, BankingRecord, SocialRecord):
            dataset_rows.extend(list(await db.scalars(select(model).where(model.case_id == case_id))))
        if dataset_rows:
            await self._ensure_provenance(db, case_id, dataset_rows, "overview")
        evidence_count = await db.scalar(select(func.count()).select_from(EvidenceRecordRow).where(EvidenceRecordRow.case_id == case_id)) or 0
        metrics = await self.fraud_analysis(case_id, db)
        return {
            "caseId": case_id,
            "suspects": metrics["suspiciousEntitiesCount"],
            "evidenceCount": evidence_count,
            "anomalies": metrics["anomalyEventsCount"],
        }

    async def dashboard_for_user(self, db: AsyncSession | None = None) -> dict:
        """Return the data needed to render the command-center dashboard."""
        active_cases = [case for case in self.cases if case.status == "active"]
        open_alerts = [alert for alert in self.alerts if alert.severity in {"high", "watch"}]
        case_count = len(self.cases)
        dataset_activity = self.weekly_activity
        if db:
            case_count = await db.scalar(select(func.count()).select_from(Case)) or 0
            dataset_count = 0
            for model in (CdrRecord, IpdrRecord, BankingRecord, SocialRecord):
                dataset_count += await db.scalar(select(func.count()).select_from(model)) or 0
            dataset_activity = [{"day": "Live", "fullDate": "Database datasets", "alerts": dataset_count, "resolved": 0}]
            fraud = await self.fraud_analysis("*", db)
            evidence_count = await db.scalar(select(func.count()).select_from(EvidenceRecordRow)) or 0
            first_case_id = await db.scalar(select(Case.id).order_by(Case.created_at.desc()))
            story = (
                await self.story_claims_for_case(first_case_id, db)
                if first_case_id
                else {"claims": [], "provenanceVerified": False}
            )
            dashboard_alerts = [
                {
                    **alert.model_dump(),
                    "evidenceIds": [self._evidence_id(item) for item in alert.evidenceIds],
                    "narrativeClaimIds": [
                        claim["id"]
                        for claim in story["claims"]
                        if any(evidence_id in claim["evidenceIds"] for evidence_id in [self._evidence_id(item) for item in alert.evidenceIds])
                    ],
                }
                for alert in self.alerts
            ]
            dataset_activity.append({
                "day": "Fraud",
                "fullDate": "Dataset anomaly analysis",
                "alerts": fraud["anomalyEventsCount"],
                "resolved": 0,
            })
        else:
            evidence_count = len(self.evidence)
            dashboard_alerts = self.alerts
            story = {"provenanceVerified": False}
            fraud = {
                "suspiciousEntitiesCount": 0,
                "flaggedTransactionsCount": 0,
                "anomalyEventsCount": 0,
            }
        return {
            "summary": {
                "activeCases": len(active_cases),
                "openAlerts": len(open_alerts),
                "highSeverityAlerts": sum(1 for alert in open_alerts if alert.severity == "high"),
                "entitiesTracked": sum(case.entities for case in self.cases),
                "caseCount": case_count,
                "avgTimeToLeadMinutes": 6.4,
                **fraud,
                "evidenceCount": evidence_count,
                "provenanceVerified": evidence_count > 0,
                "storyModeVerified": story["provenanceVerified"],
            },
            "cases": self.cases,
            "alerts": dashboard_alerts,
            "activity": dataset_activity,
        }

    def cases_for_dashboard(self) -> list:
        status_colors = {"active": "#16874f", "review": "#d97a06", "closed": "#94989f"}
        return [
            {**case.model_dump(), "statusColor": status_colors[case.status]}
            for case in self.cases
        ]

    def alerts_for_dashboard(self) -> list:
        return self.alerts

    def activity_for_dashboard(self) -> list:
        return self.weekly_activity

    async def geo_for_case(self, case_id: str, db: AsyncSession) -> list[dict]:
        if await db.get(Case, case_id) is None:
            raise HTTPException(status_code=404, detail="Case not found.")
        rows = list(await db.scalars(select(CdrRecord).where(CdrRecord.case_id == case_id)))
        result = []
        for row in rows:
            attrs = row.attributes or {}
            latitude = attrs.get("latitude", attrs.get("lat"))
            longitude = attrs.get("longitude", attrs.get("lng", attrs.get("lon")))
            if latitude is None or longitude is None:
                continue
            result.append({"id": row.id, "latitude": float(latitude), "longitude": float(longitude),
                           "title": "CDR location", "timestamp": row.timestamp.isoformat(),
                           "entityIds": [row.caller, row.callee], "source": "CDR"})
        return result

    async def report_for_case(self, case_id: str, db: AsyncSession | None = None) -> dict:
        return {
            "case": await self.overview_for_case(case_id, db),
            "graph": await self.graph_for_case(case_id, db),
            "timeline": await self.timeline_for_case(case_id, db),
            "evidence": await self.evidence_for_case(case_id, db),
        }

    
    async def financial_flow_for_case(self, case_id: str, db: AsyncSession) -> FinancialFlowResponse:
        if await db.get(Case, case_id) is None:
            raise HTTPException(status_code=404, detail="Case not found.")
        rows = list(await db.scalars(select(BankingRecord).where(BankingRecord.case_id == case_id)))
        nodes_by_id = {}
        links = []
        flows = []
        for row in rows:
            sender_id, recipient_id = f"account:{row.sender}", f"account:{row.recipient}"
            nodes_by_id.setdefault(sender_id, FinancialFlowNode(id=sender_id, label=row.sender))
            nodes_by_id.setdefault(recipient_id, FinancialFlowNode(id=recipient_id, label=row.recipient))
            evidence_id = self._evidence_id(row.id)
            links.append(FinancialFlowLink(source=sender_id, target=recipient_id, value=int(row.amount), evidenceIds=[evidence_id]))
            flows.append({"from": row.sender, "to": row.recipient, "amount": float(row.amount), "channel": row.channel, "evidenceId": evidence_id})
        return {
            "flows": flows,
            "nodes": list(nodes_by_id.values()),
            "links": links,
        }

    async def copilot_messages_for_case(
        self,
        case_id: str,
        query: str | None = None,
        db: AsyncSession | None = None,
    ) -> list[CopilotMessage]:
        case = None
        if db is not None:
            try:
                case = await db.get(Case, case_id)
            except Exception:
                raise HTTPException(
                    status_code=503,
                    detail="Database temporarily unavailable.",
                )
        if case is None:
            case = next((c for c in self.cases if c.id == case_id), None)
        if case is None:
            raise HTTPException(status_code=404, detail="Case not found.")

        if not query or not query.strip():
            return self.copilot_seed

        claims = await self.copilot_query(case_id, query, db)
        answer_text = (
            " ".join([c.text for c in claims])
            if claims
            else f"No matching evidence was found for query: '{query}'."
        )

        q_lower = query.lower()
        if any(term in q_lower for term in ("call", "phone", "cdr", "caller", "callee")):
            suggestions = [
                "Show CDR call network graph",
                "Inspect frequency and duration of suspect calls",
                "Trace alternate phone identifiers",
            ]
        elif any(term in q_lower for term in ("bank", "account", "transfer", "amount", "financial", "money")):
            suggestions = [
                "Show financial flow graph",
                "Analyze rapid high-value transactions",
                "Check beneficiary account links",
            ]
        elif any(term in q_lower for term in ("ip", "ipdr", "network", "traffic", "session")):
            suggestions = [
                "Inspect IP session logs",
                "Correlate shared IP clusters",
                "View geographical connection map",
            ]
        else:
            suggestions = [
                "Show case overview and key entities",
                "Generate narrative timeline",
                "Explore evidence provenance records",
            ]

        return [
            CopilotMessage(id="msg_q", role="analyst", text=query),
            CopilotMessage(
                id="msg_a",
                role="evidra",
                text=answer_text,
                claims=claims,
                suggestions=suggestions,
            ),
        ]

    async def copilot_query(self, case_id: str, query: str, db: AsyncSession | None = None) -> list[StoryClaim]:
        case = None
        if db is not None:
            try:
                case = await db.get(Case, case_id)
            except Exception:
                raise HTTPException(
                    status_code=503,
                    detail="Database temporarily unavailable.",
                )
        if case is None:
            case = next((c for c in self.cases if c.id == case_id), None)
        if case is None:
            raise HTTPException(status_code=404, detail="Case not found.")

        raw_claims = []
        if db is not None:
            try:
                raw_claims = (await self.story_claims_for_case(case_id, db))["claims"]
            except Exception:
                raise HTTPException(
                    status_code=503,
                    detail="Database temporarily unavailable.",
                )
        if not raw_claims:
            raw_claims = [
                {
                    "id": c.id,
                    "text": c.text,
                    "evidenceId": getattr(c, "evidenceId", c.evidenceIds[0] if c.evidenceIds else None),
                    "evidenceIds": c.evidenceIds,
                    "confidence": c.confidence,
                    "rule": c.rule,
                }
                for c in self.story_claims
            ]

        aliases = {
            "phone": "call",
            "network": "call",
            "calling": "call",
            "called": "call",
            "bank": "transfer",
            "banking": "transfer",
            "account": "transfer",
            "transferred": "transfer",
            "transfers": "transfer",
        }

        def normalize(term: str) -> str:
            lowered = term.lower()
            return aliases.get(lowered, lowered.removesuffix("ing").removesuffix("ed"))

        terms = {normalize(term) for term in re.findall(r"[a-z0-9]+", query) if len(term) > 2}

        def score(claim: dict) -> int:
            haystack = " ".join(
                [
                    claim["text"],
                    claim.get("rule") or "",
                    " ".join(
                        provenance.get("sourceDataset", "")
                        for provenance in claim.get("provenance", [])
                    ),
                ]
            )
            return len(terms & {normalize(term) for term in re.findall(r"[a-z0-9]+", haystack)})

        ranked = sorted(raw_claims, key=score, reverse=True)
        return [StoryClaim(**claim) for claim in ranked if not terms or score(claim) > 0][:10]

    async def investigate(self, case_id: str, mode: str, db: AsyncSession):
        if mode == "graph":
            return await self.graph_for_case(case_id, db)
        elif mode == "timeline":
            return await self.timeline_for_case(case_id, db)
        elif mode == "evidence":
            return await self.evidence_for_case(case_id, db)
        else:
            return {"error": "Invalid mode"}

    
    async def investigate_all(self, case_id: str, db: AsyncSession):
        return {
            "graph": await self.graph_for_case(case_id, db),
            "timeline": await self.timeline_for_case(case_id, db),
            "evidence": await self.evidence_for_case(case_id, db)
        }

store = DataStore()
