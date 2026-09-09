import type {
  CaseSummary,
  CopilotMessage,
  EvidenceRecord,
  FinancialFlowResponse,
  GraphEdge,
  Entity,
  StoryClaim,
  TimelineEvent,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.sessionStorage.getItem("evidra:token");
  return token ? { Authorization: "Bearer " + token } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value));
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
}

export interface OfficerIdentity {
  username: string;
  role: string;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export async function getMe(): Promise<OfficerIdentity> {
  return request<OfficerIdentity>("/auth/me");
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") window.sessionStorage.setItem("evidra:token", token);
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") window.sessionStorage.removeItem("evidra:token");
}

export interface CaseCreatePayload {
  name: string;
  id?: string;
  case_type?: string;
  description?: string;
  investigation_mode?: "entity" | "evidence" | "event";
  seed_type?: "phone" | "bank_account" | "social_handle";
  seed_value?: string;
  evidence_type?: "CDR" | "IPDR" | "Banking" | "Social" | "Identity";
  incident_date?: string;
  event_description?: string;
  priority?: "critical" | "high" | "medium" | "low";
}

export interface CaseApiResponse {
  id: string;
  name: string;
  created_at: string;
  title?: string;
  status?: CaseSummary["status"];
  priority?: CaseSummary["priority"];
  opened?: string;
  lead?: string;
  entities?: number;
  alerts?: number;
  riskScore?: number;
  tags?: string[];
  case_type?: string;
  description?: string;
  investigation_mode?: "entity" | "evidence" | "event";
  seed_type?: string;
  seed_value?: string;
  evidence_type?: string;
  incident_date?: string;
  event_description?: string;
}

export async function createCase(payload: CaseCreatePayload): Promise<CaseApiResponse> {
  return request("/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function listCases(): Promise<CaseApiResponse[]> {
  return request("/cases");
}

export function getCase(id: string): Promise<CaseApiResponse> {
  return request(`/cases/${id}`);
}

export async function deleteCase(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/cases/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to delete case: ${response.status}`);
}

export interface CdrCreatePayload {
  caller: string;
  callee: string;
  duration_seconds?: number;
}
export interface CdrRecord extends CdrCreatePayload {
  id: string;
  case_id: string;
  duration_seconds: number;
  timestamp: string;
}

export function createCdr(caseId: string, payload: CdrCreatePayload): Promise<CdrRecord> {
  return request(`/cases/${caseId}/cdr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function listCdr(caseId: string): Promise<CdrRecord[]> {
  return request(`/cases/${caseId}/cdr`);
}

export interface BulkUploadResponse {
  created: number;
  rejected: Array<{ row: number; reason: string }>;
  sample_ids: string[];
}

async function uploadBulk(path: string, file: File): Promise<BulkUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  return request(path, { method: "POST", body: form });
}

export function uploadCdrBulk(caseId: string, file: File): Promise<BulkUploadResponse> {
  return uploadBulk(`/cases/${caseId}/cdr/bulk`, file);
}

export interface IpdrRecord {
  id: string;
  case_id: string;
  source_ip: string;
  destination_ip: string;
  protocol: string;
  timestamp: string;
}
export function createIpdr(caseId: string, payload: Omit<IpdrRecord, "id" | "case_id" | "timestamp">): Promise<IpdrRecord> {
  return request(`/cases/${caseId}/ipdr`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}
export function listIpdr(caseId: string): Promise<IpdrRecord[]> {
  return request(`/cases/${caseId}/ipdr`);
}

export interface IdentityRecord {
  id: string;
  case_id: string;
  subject: string;
  document_type: string;
  document_hash: string;
  timestamp: string;
}
export function createIdentity(caseId: string, payload: Omit<IdentityRecord, "id" | "case_id" | "timestamp">): Promise<IdentityRecord> {
  return request(`/cases/${caseId}/identity`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}
export function listIdentity(caseId: string): Promise<IdentityRecord[]> {
  return request(`/cases/${caseId}/identity`);
}

export interface BankingCreatePayload {
  sender: string;
  recipient: string;
  amount: number;
  channel?: string;
}
export interface BankingRecord extends BankingCreatePayload {
  id: string;
  case_id: string;
  amount: number;
  channel: string;
  timestamp: string;
}

export function createBanking(caseId: string, payload: BankingCreatePayload): Promise<BankingRecord> {
  return request(`/cases/${caseId}/banking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function listBanking(caseId: string): Promise<BankingRecord[]> {
  return request(`/cases/${caseId}/banking`);
}

export function uploadBankingBulk(caseId: string, file: File): Promise<BulkUploadResponse> {
  return uploadBulk(`/cases/${caseId}/banking/bulk`, file);
}

export interface SocialCreatePayload {
  actor: string;
  target: string;
  platform?: string;
  interaction?: string;
}
export interface SocialRecord extends SocialCreatePayload {
  id: string;
  case_id: string;
  platform: string;
  interaction: string;
  timestamp: string;
}

export function createSocial(caseId: string, payload: SocialCreatePayload): Promise<SocialRecord> {
  return request(`/cases/${caseId}/social`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function listSocial(caseId: string): Promise<SocialRecord[]> {
  return request(`/cases/${caseId}/social`);
}

export function uploadSocialBulk(caseId: string, file: File): Promise<BulkUploadResponse> {
  return uploadBulk(`/cases/${caseId}/social/bulk`, file);
}

export interface ReportEntity {
  type: string;
  value: string;
  confidence: "high" | "ambiguous";
  offset: number;
}

export interface ReportRecord {
  id: string;
  case_id: string;
  raw_text: string;
  submitted_by: string;
  submitted_at: string;
  extracted_entities: ReportEntity[];
}

export function createReport(caseId: string, rawText: string): Promise<ReportRecord> {
  return request(`/cases/${caseId}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_text: rawText }),
  });
}

export function uploadReport(
  caseId: string,
  file: File,
  rawText?: string,
): Promise<ReportRecord> {
  const form = new FormData();
  form.append("file", file);
  if (rawText?.trim()) form.append("raw_text", rawText);
  return request(`/cases/${caseId}/reports/file`, {
    method: "POST",
    body: form,
  });
}

export function listReports(caseId: string): Promise<ReportRecord[]> {
  return request(`/cases/${caseId}/reports`);
}

export interface GraphApiResponse {
  entities: Entity[];
  edges: GraphEdge[];
  fraudMetrics?: Record<string, number>;
}
export function getGraph(caseId: string): Promise<GraphApiResponse> {
  return request(`/cases/${caseId}/graph`);
}

export interface RiskFactor {
  label: string;
  score: number;
}

export function getRiskFactors(caseId: string): Promise<{ riskFactors: RiskFactor[] }> {
  return request(`/cases/${caseId}/risk-factors`);
}

export function getTimeline(caseId: string): Promise<TimelineEvent[]> {
  return request(`/cases/${caseId}/timeline`);
}

export function getStory(caseId: string): Promise<{
  claims: StoryClaim[];
  narrative: string;
  provenanceVerified: boolean;
}> {
  return request(`/cases/${caseId}/story`);
}

export function getFinancial(
  caseId: string
): Promise<FinancialFlowResponse & { flows?: Array<Record<string, string | number>> }> {
  return request(`/cases/${caseId}/financial`);
}

export interface GeoEvent {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  timestamp: string;
  entityIds: string[];
  source: string;
}
export function getGeo(caseId: string): Promise<GeoEvent[]> {
  return request(`/cases/${caseId}/geo`);
}

export function getEvidence(caseId: string): Promise<{ evidence: EvidenceRecord[] }> {
  return request(`/cases/${caseId}/evidence`);
}
export function getEvidenceRecord(caseId: string, evidenceId: string): Promise<EvidenceRecord> {
  return request(`/cases/${caseId}/evidence/${evidenceId}`);
}

export function getCopilotSeed(caseId: string): Promise<CopilotMessage[]> {
  return request(`/cases/${caseId}/copilot`);
}
export function queryCopilot(caseId: string, query: string): Promise<StoryClaim[]> {
  return request("/copilot/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ case_id: caseId, query }),
  });
}

export function getReport(caseId: string): Promise<Record<string, unknown>> {
  return request(`/cases/${caseId}/report`);
}
export async function downloadReport(caseId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/cases/${caseId}/report.pdf`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to download report: ${response.status}`);
  return response.blob();
}

export function getDashboard(): Promise<Record<string, unknown>> {
  return request("/dashboard");
}
