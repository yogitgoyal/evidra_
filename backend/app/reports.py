from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Flowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy.ext.asyncio import AsyncSession


from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

REPORTS_DIR = Path(__file__).resolve().parents[1] / "reports"


def _register_unicode_font() -> str:
    font_candidates = [
        Path("C:/Windows/Fonts/Nirmala.ttc"),
        Path("C:/Windows/Fonts/Nirmala.ttf"),
        Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for path in font_candidates:
        if path.exists():
            try:
                name = path.stem
                if path.suffix == ".ttc":
                    font = TTFont(name, str(path), subfontIndex=0)
                else:
                    font = TTFont(name, str(path))
                pdfmetrics.registerFont(font)
                return name
            except Exception:
                pass
    return "Helvetica"


FONT_NAME = _register_unicode_font()


def _label_value_table(rows: list[tuple[str, Any]], body: ParagraphStyle) -> Table:
    table = Table(
        [
            [Paragraph(_plain(label), body), Paragraph(_plain(value), body)]
            for label, value in rows
        ],
        colWidths=[1.5 * inch, 5.1 * inch],
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef3f7")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#9aa8b5")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#c5cdd4")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _plain(value: Any) -> str:
    if value is None:
        return ""
    s = str(value)
    replacements = {
        "\u20b9": "Rs. ",
        "\u2014": " - ",
        "\u2013": "-",
        "\u2022": "*",
        "\u2026": "...",
        "\u201c": '"',
        "\u201d": '"',
        "\u2018": "'",
        "\u2019": "'",
    }
    for orig, repl in replacements.items():
        s = s.replace(orig, repl)
    return s


class GraphSnapshot(Flowable):
    def __init__(self, graph: dict[str, Any]):
        super().__init__()
        self.graph = graph
        self.width = 7 * inch
        self.height = 2.2 * inch

    def draw(self) -> None:
        canvas = self.canv
        nodes = self.graph.get("entities", [])[:12]
        edges = self.graph.get("edges", [])
        positions = {}
        for index, node in enumerate(nodes):
            x = 30 + (index % 6) * 78
            y = 120 - (index // 6) * 70
            positions[node["id"]] = (x, y)
            canvas.setFillColor(colors.HexColor("#d9f3ff"))
            canvas.circle(x, y, 14, fill=1, stroke=1)
            canvas.setFillColor(colors.black)
            canvas.setFont(FONT_NAME, 6)
            canvas.drawCentredString(x, y - 23, _plain(node["label"])[:16])
        canvas.setStrokeColor(colors.HexColor("#4c879f"))
        for edge in edges[:18]:
            source = positions.get(edge["source"])
            target = positions.get(edge["target"])
            if source and target:
                canvas.line(source[0], source[1], target[0], target[1])


async def build_report(store, case_id: str, db: AsyncSession) -> dict[str, Any]:
    graph_model = await store.graph_for_case(case_id, db)
    timeline_models = await store.timeline_for_case(case_id, db)
    story = await store.story_claims_for_case(case_id, db)
    dashboard = await store.dashboard_for_user(db)
    overview = await store.overview_for_case(case_id, db)
    graph = graph_model.model_dump()
    timeline = [event.model_dump() for event in timeline_models]
    fraud_metrics = graph.get("fraudMetrics") or {
        "suspiciousEntitiesCount": 0,
        "flaggedTransactionsCount": 0,
        "anomalyEventsCount": 0,
        "sharedIdentityPhoneGroups": 0,
        "sharedIpGroups": 0,
        "closedSocialLoops": 0,
    }
    report = {
        "metadata": {
            "caseId": case_id,
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "pdfPath": str(REPORTS_DIR / f"{case_id}.pdf"),
            "pdfUrl": f"/cases/{case_id}/report.pdf",
        },
        "case": overview,
        "graph": {
            "entityCount": len(graph["entities"]),
            "edgeCount": len(graph["edges"]),
            "fraudMetrics": fraud_metrics,
            "entities": graph["entities"],
            "edges": graph["edges"],
        },
        "timeline": {
            "eventCount": len(timeline),
            "events": timeline,
        },
        "story": story,
        "dashboard": {
            "summary": dashboard["summary"],
            "alerts": dashboard["alerts"],
            "evidenceCount": dashboard["summary"].get("evidenceCount", 0),
            "provenanceVerified": dashboard["summary"].get("provenanceVerified", False),
            "storyModeVerified": story["provenanceVerified"],
        },
        "evidence": [item.model_dump() for item in await store.evidence_for_case(case_id, db)],
    }
    report["provenanceVerified"] = (
        report["dashboard"]["provenanceVerified"]
        and report["story"]["provenanceVerified"]
        and all(claim["valid"] for claim in report["story"]["claims"])
    )
    _write_pdf(report)
    return report


def _write_pdf(report: dict[str, Any]) -> None:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORTS_DIR / f"{report['metadata']['caseId']}.pdf"
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("UnicodeTitle", parent=styles["Title"], fontName=FONT_NAME)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontName=FONT_NAME, fontSize=9, leading=12, alignment=TA_LEFT)
    heading = ParagraphStyle("Heading", parent=styles["Heading2"], fontName=FONT_NAME, spaceBefore=10, spaceAfter=6)
    graph_section = report.get("graph", {}) or {}
    fraud_metrics = graph_section.get("fraudMetrics") or {
        "suspiciousEntitiesCount": 0,
        "flaggedTransactionsCount": 0,
        "anomalyEventsCount": 0,
    }

    story = [
        Paragraph(f"EVIDRA Investigation Report - Case #{_plain(report['metadata']['caseId'])}", title_style),
        Paragraph(f"Generated: {_plain(report['metadata']['generatedAt'])}", body),
        Paragraph("Case Overview", heading),
        _label_value_table(
            [
                ("Case ID", report["metadata"]["caseId"]),
                ("Suspects", report["case"]["suspects"]),
                ("Evidence Count", report["case"]["evidenceCount"]),
                ("Anomalies", report["case"]["anomalies"]),
            ],
            body,
        ),
        Paragraph("Graph Summary", heading),
        _label_value_table(
            [
                ("Entities", report["graph"]["entityCount"]),
                ("Edges", report["graph"]["edgeCount"]),
                ("Suspicious Entities", fraud_metrics.get("suspiciousEntitiesCount", 0)),
                ("Flagged Transactions", fraud_metrics.get("flaggedTransactionsCount", 0)),
                ("Anomaly Events", fraud_metrics.get("anomalyEventsCount", 0)),
            ],
            body,
        ),
        GraphSnapshot(report["graph"]),
        Paragraph("Timeline Events", heading),
    ]
    timeline_rows = [["Timestamp", "Severity", "Description", "Evidence"]]
    for event in report["timeline"]["events"]:
        timeline_rows.append([
            _plain(event["timestamp"]),
            _plain(event["severity"]),
            Paragraph(_plain(event["description"]), body),
            _plain(", ".join(event.get("evidenceIds", []))),
        ])
    story.append(Table(timeline_rows, colWidths=[1.05 * inch, 0.65 * inch, 3.2 * inch, 1.4 * inch], repeatRows=1, style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#d9f3ff")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
    ])))
    story.extend([Paragraph("Story Narration", heading), Paragraph(_plain(report["story"]["narrative"]), body)])
    story.append(Paragraph(f"Story provenance verified: {_plain(report['story']['provenanceVerified'])}", body))
    story.append(Paragraph("Provenance Status", heading))
    story.append(Paragraph(f"Report provenance verified: {_plain(report['provenanceVerified'])}", body))
    story.append(Paragraph(f"Evidence count: {_plain(report['dashboard']['evidenceCount'])}", body))
    story.append(Paragraph("Dashboard Metrics and Alerts", heading))
    story.append(_label_value_table(
        [
            ("Active Cases", report["dashboard"]["summary"].get("activeCases", 0)),
            ("Open Alerts", report["dashboard"]["summary"].get("openAlerts", 0)),
            ("Entities Tracked", report["dashboard"]["summary"].get("entitiesTracked", 0)),
            ("Evidence Count", report["dashboard"]["evidenceCount"]),
            ("Provenance Verified", report["dashboard"]["provenanceVerified"]),
            ("Story Mode Verified", report["dashboard"]["storyModeVerified"]),
        ],
        body,
    ))
    for alert in report["dashboard"]["alerts"]:
        story.append(Paragraph(
            f"Alert: {_plain(alert.get('title'))} | severity: {_plain(alert.get('severity'))} | "
            f"evidence: {_plain(', '.join(alert.get('evidenceIds', [])))}",
            body,
        ))
    story.append(PageBreak())
    story.append(Paragraph("Narrative Claims and Evidence", heading))
    for claim in report["story"]["claims"]:
        story.append(Paragraph(
            f"Rule: {_plain(claim.get('rule'))} | confidence: {_plain(claim.get('confidence'))} | "
            f"evidence: {_plain(', '.join(claim['evidenceIds']))} | valid: {_plain(claim['valid'])}",
            body,
        ))
        story.append(Spacer(1, 4))
    SimpleDocTemplate(str(path), pagesize=letter, rightMargin=0.55 * inch, leftMargin=0.55 * inch, topMargin=0.55 * inch, bottomMargin=0.55 * inch).build(story)
