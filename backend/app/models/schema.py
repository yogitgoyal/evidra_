from typing import Optional, Union, Literal
from pydantic import BaseModel

# ---------- Shared enums ----------
EntityType = Literal["person","phone","sim","device","ip","account","upi","tower","location","social","vehicle"]
MatchConfidence = Literal["high","ambiguous","none"]
EdgeKind = Literal["CALLED","MESSAGED","TRANSFERRED_TO","OWNS","USES","LOCATED_AT","MENTIONED","CO_OCCURRED","SHARED_DEVICE","SHARED_LOCATION","POSSIBLE_SAME_IDENTIFIER"]
EvidenceSource = Literal["CDR","IPDR","Banking","Social","Identity","Report"]
TimelineType = Literal["banking","telecom","social","location"]
TimelineSeverity = Literal["critical","high","watch","info","medium","low"]
CaseStatus = Literal["active","review","closed"]
CasePriority = Literal["critical","high","medium","low"]
CopilotRole = Literal["analyst","evidra"]
AlertSeverity = Literal["high","watch","info"]

# ---------- Core entities ----------
class Entity(BaseModel):
    id: str
    type: EntityType
    label: str
    sublabel: Optional[str] = None
    risk: int
    confidence: MatchConfidence
    tags: Optional[list[str]] = None

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    kind: EdgeKind
    confidence: MatchConfidence
    weight: int
    evidenceId: Optional[str] = None
    evidenceIds: list[str]

class EvidenceRecord(BaseModel):
    id: str
    source: EvidenceSource
    summary: str
    timestamp: str
    hash: str
    ingested: str
    fields: dict[str, Union[str,int,float]]
    ruleTriggered: Optional[str] = None
    confidence: Optional[float] = None

class TimelineEvent(BaseModel):
    id: str
    timestamp: str
    title: str
    type: Optional[TimelineType] = None
    description: str
    source: str
    entityIds: list[str]
    evidenceId: Optional[str] = None
    evidenceIds: list[str]
    confidence: Optional[MatchConfidence] = None
    ruleTriggered: Optional[str] = None
    severity: TimelineSeverity

class StoryClaim(BaseModel):
    id: str
    text: str
    evidenceId: Optional[str] = None
    evidenceIds: list[str]
    confidence: Union[float,str]
    rule: Optional[str] = None

class CopilotMessage(BaseModel):
    id: str
    role: CopilotRole
    text: str
    claims: Optional[list[StoryClaim]] = None
    suggestions: Optional[list[str]] = None

class CaseSummary(BaseModel):
    id: str
    title: str
    status: CaseStatus
    priority: CasePriority
    opened: str
    lead: str
    entities: int
    alerts: int
    riskScore: int
    tags: list[str]

# ---------- Dashboard ----------
class AlertItem(BaseModel):
    id: str
    caseId: str
    title: str
    rule: str
    severity: AlertSeverity
    time: str
    evidenceIds: list[str]

class ActivityDay(BaseModel):
    day: str
    fullDate: str
    alerts: int
    resolved: int

# ---------- Composite responses ----------
class GraphResponse(BaseModel):
    entities: list[Entity]
    edges: list[GraphEdge]
    fraudMetrics: Optional[dict[str, int]] = None

class FinancialFlowNode(BaseModel):
    id: str
    label: str

class FinancialFlowLink(BaseModel):
    source: str
    target: str
    value: int
    evidenceIds: list[str]

class FinancialFlowResponse(BaseModel):
    nodes: list[FinancialFlowNode]
    links: list[FinancialFlowLink]
