const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export async function getDashboard() {
  return getFromApi("/dashboard");
}

export function getCases() {
  return getFromApi("/cases");
}

export async function getEvidence(caseId) {
  return requestFromApi("get", `/cases/${caseId}/evidence`);
}

async function requestFromApi(method, path, data, responseType) {
  const token = typeof window !== "undefined" ? window.sessionStorage.getItem("evidra:token") : null;
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) throw new Error(`Backend request failed: ${response.status}`);
  return responseType === "blob" ? response.blob() : response.json();
}

function getFromApi(path) {
  return requestFromApi("get", path);
}

export function getTimeline(caseId) {
  return getFromApi(`/cases/${caseId}/timeline`);
}

export function getGraph(caseId) {
  return getFromApi(`/cases/${caseId}/graph`);
}

export function getOverview(caseId) {
  return getFromApi(`/cases/${caseId}/overview`);
}

export function getFinancial(caseId) {
  return getFromApi(`/cases/${caseId}/financial`);
}

export function getGeo(caseId) {
  return getFromApi(`/cases/${caseId}/geo`);
}

export function getReport(caseId) {
  return getFromApi(`/cases/${caseId}/report`);
}

export function downloadReport(caseId) {
  return requestFromApi("get", `/cases/${caseId}/report.pdf`, undefined, "blob");
}

export async function queryCopilot(caseId, query) {
  return requestFromApi("post", "/copilot/query", { case_id: caseId, query });
}
