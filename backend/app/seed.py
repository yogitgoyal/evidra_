# backend/app/seed.py
# Tumhare lib/data.ts ko Python mein convert kiya gaya hai
# Abhi skeleton hai, tumhe apna actual data paste karna hoga

from app.models import CaseSummary, Entity, GraphEdge, EvidenceRecord, TimelineEvent, StoryClaim, CopilotMessage, AlertItem, ActivityDay

cases = [
    CaseSummary(id="2047", title="Case #2047 — Fan-in Mule Network, Sector 18", status="active", priority="critical", opened="2026-08-11", lead="R. Bhandari", entities=19, alerts=7, riskScore=87, tags=["banking","telecom","mule-network"]),
    CaseSummary(id="1988", title="Case #1988 — OTP Phishing Cluster, MG Road", status="review", priority="high", opened="2026-07-29", lead="S. Iyer", entities=12, alerts=4, riskScore=71, tags=["social","phishing"]),
    CaseSummary(id="1954", title="Case #1954 — Dormant Account Reactivation", status="active", priority="medium", opened="2026-07-14", lead="R. Bhandari", entities=8, alerts=2, riskScore=54, tags=["banking"]),
    CaseSummary(id="1901", title="Case #1901 — IMEI Cluster, Tower 44B", status="closed", priority="low", opened="2026-06-02", lead="A. Nair", entities=15, alerts=1, riskScore=22, tags=["telecom"]),
]

active_case = cases[0]

entities = [
    Entity(id="p1", type="person", label="Unknown Subject A", sublabel="Entry point", risk=92, confidence="high", tags=["origin"]),
    # ... baaki entities
]

edges = [
    GraphEdge(id="e1", source="p1", target="ph1", kind="OWNS", confidence="high", weight=3, evidenceIds=["id_0001"]),
    # ... baaki edges
]

evidence = [
    EvidenceRecord(id="txn_0193", source="Banking", summary="₹48,000 transferred A/C ••2290 → A/C ••4471 via IMPS", timestamp="2026-08-20 14:02:11", hash="8f21…c30a", ingested="2026-08-21 09:14:02", fields={"channel":"IMPS","amount":48000,"from":"A/C ••2290","to":"A/C ••4471"}, ruleTriggered="HIGH_FAN_IN", confidence=0.92),
    # ... baaki evidence
]

evidence_by_id = {e.id: e for e in evidence}

timeline = [
    TimelineEvent(id="t1", timestamp="2026-08-20 13:41:03", title="First contact", description="Unknown Subject A calls R. Malhotra for 4m12s from Tower 12-C.", source="CDR", entityIds=["ph1","ph2"], evidenceIds=["cdr_0482"], severity="info"),
    # ... baaki timeline events
]

story_claims = [
    StoryClaim(id="c1", text="Account ••4471 received transfers from 3 unrelated accounts within 18 minutes.", evidenceId="txn_0193", evidenceIds=["txn_0193","txn_0194","txn_0195"], confidence=0.92, rule="HIGH_FAN_IN"),
    StoryClaim(id="c2", text="The same account pushed ₹1,26,800 onward to a dormant account reactivated the same day.", evidenceId="txn_0198", evidenceIds=["txn_0198"], confidence=0.88, rule="DORMANT_REACTIVATION"),
    StoryClaim(id="c3", text="Subject A and K. Sethi's phones co-registered at Tower 12-C on 5 occasions during the transfer window.", evidenceId="cdr_0501", evidenceIds=["cdr_0501","cdr_0502"], confidence=0.88, rule="LOCATION_COOCCURRENCE"),
    StoryClaim(id="c4", text="IMEI •••8841 links Subject A's registered phone to an unregistered SIM active 3 hours later — the same physical device.", evidenceId="ipdr_0068", evidenceIds=["ipdr_0068","ipdr_0071"], confidence=0.95, rule="SHARED_DEVICE"),
    StoryClaim(id="c5", text="A public post geotagged at Sector 18 Market was followed 3 minutes later by a corroborating post from R. Malhotra.", evidenceId="soc_0021", evidenceIds=["soc_0021","soc_0025"], confidence=0.71, rule="TEMPORAL_SOCIAL_CORRELATION"),
]

copilot_seed = [
    CopilotMessage(id="m1", role="analyst", text="Why is account ••4471 flagged?"),
    # ... baaki messages
]

alerts = [
    AlertItem(id="al1", caseId="2047", title="High fan-in detected on A/C ••4471", rule="HIGH_FAN_IN", severity="high", time="12 min ago", evidenceIds=["txn_0193","txn_0194","txn_0195"]),
    # ... baaki alerts
]

weekly_activity = [
    ActivityDay(day="Tue", fullDate="Tue, May 13", alerts=18, resolved=12),
    # ... baaki days
]
