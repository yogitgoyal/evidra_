export type EntityType =
  | "person"
  | "phone"
  | "sim"
  | "device"
  | "ip"
  | "account"
  | "upi"
  | "tower"
  | "location"
  | "social"
  | "vehicle";

export type MatchConfidence = "high" | "ambiguous" | "none";

export interface Entity {
  id: string;
  type: EntityType;
  label: string;
  sublabel?: string;
  risk: number; // 0-100
  confidence: MatchConfidence;
  tags?: string[];
  evidenceIds?: string[];
}

export type EdgeKind =
  | "CALLED"
  | "MESSAGED"
  | "TRANSFERRED_TO"
  | "OWNS"
  | "USES"
  | "LOCATED_AT"
  | "MENTIONED"
  | "CO_OCCURRED"
  | "SHARED_DEVICE"
  | "SHARED_LOCATION"
  | "POSSIBLE_SAME_IDENTIFIER";

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  confidence: MatchConfidence;
  weight: number;
  evidenceIds: string[];
}

export interface EvidenceRecord {
  id: string;
  source: "CDR" | "IPDR" | "Banking" | "Social" | "Identity" | "Report";
  summary: string;
  timestamp: string;
  hash: string;
  ingested: string;
  fields: Record<string, string | number>;
  ruleTriggered?: string;
  confidence?: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  type?: "banking" | "telecom" | "social" | "location";
  description: string;
  source: string;
  entityIds: string[];
  evidenceId?: string;
  evidenceIds: string[];
  confidence?: MatchConfidence;
  ruleTriggered?: string;
  severity: "critical" | "high" | "watch" | "info" | "medium" | "low";
}

export interface StoryClaim {
  id: string;
  text: string;
  evidenceIds: string[];
  confidence: number | string;
  rule?: string;
}

export interface CopilotMessage {
  id: string;
  role: "analyst" | "evidra";
  text: string;
  claims?: StoryClaim[];
  suggestions?: string[];
}

export interface CaseSummary {
  id: string;
  title: string;
  status: "active" | "review" | "closed";
  priority: "critical" | "high" | "medium" | "low";
  opened: string;
  lead: string;
  entities: number;
  alerts: number;
  riskScore: number;
  tags: string[];
}

export interface FinancialFlowNode {
  id: string;
  label: string;
}

export interface FinancialFlowLink {
  source: string;
  target: string;
  value: number;
  evidenceIds: string[];
}

export interface FinancialFlowResponse {
  nodes: FinancialFlowNode[];
  links: FinancialFlowLink[];
}
