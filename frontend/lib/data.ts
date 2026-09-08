import {
  CaseSummary,
  CopilotMessage,
  Entity,
  EvidenceRecord,
  GraphEdge,
  StoryClaim,
  TimelineEvent,
} from "./types";

export const cases: CaseSummary[] = [
  {
    id: "2047",
    title: "Case #2047 — Fan-in Mule Network, Sector 18",
    status: "active",
    priority: "critical",
    opened: "2026-08-11",
    lead: "R. Bhandari",
    entities: 19,
    alerts: 7,
    riskScore: 87,
    tags: ["banking", "telecom", "mule-network"],
  },
  {
    id: "1988",
    title: "Case #1988 — OTP Phishing Cluster, MG Road",
    status: "review",
    priority: "high",
    opened: "2026-07-29",
    lead: "S. Iyer",
    entities: 12,
    alerts: 4,
    riskScore: 71,
    tags: ["social", "phishing"],
  },
  {
    id: "1954",
    title: "Case #1954 — Dormant Account Reactivation",
    status: "active",
    priority: "medium",
    opened: "2026-07-14",
    lead: "R. Bhandari",
    entities: 8,
    alerts: 2,
    riskScore: 54,
    tags: ["banking"],
  },
  {
    id: "1901",
    title: "Case #1901 — IMEI Cluster, Tower 44B",
    status: "closed",
    priority: "low",
    opened: "2026-06-02",
    lead: "A. Nair",
    entities: 15,
    alerts: 1,
    riskScore: 22,
    tags: ["telecom"],
  },
];

export const activeCase = cases[0];

// ---------- Entities (Case #2047) ----------
export const entities: Entity[] = [
  { id: "p1", type: "person", label: "Unknown Subject A", sublabel: "Entry point", risk: 92, confidence: "high", tags: ["origin"] },
  { id: "p2", type: "person", label: "R. Malhotra", sublabel: "Person of interest", risk: 88, confidence: "high" },
  { id: "p3", type: "person", label: "K. Sethi", sublabel: "Bridge candidate", risk: 81, confidence: "high", tags: ["bridge"] },
  { id: "p4", type: "person", label: "Unknown Subject B", sublabel: "Community 2", risk: 64, confidence: "ambiguous" },
  { id: "p5", type: "person", label: "N. Verma", sublabel: "Community 2", risk: 58, confidence: "high" },

  { id: "ph1", type: "phone", label: "+91 98••• 4471", sublabel: "Owner: Unknown Subject A", risk: 90, confidence: "high" },
  { id: "ph2", type: "phone", label: "+91 96••• 2290", sublabel: "Owner: R. Malhotra", risk: 85, confidence: "high" },
  { id: "ph3", type: "phone", label: "+91 90••• 7712", sublabel: "Owner: K. Sethi", risk: 79, confidence: "high" },
  { id: "ph4", type: "phone", label: "+91 88••• 0093", sublabel: "Owner: Unknown Subject B", risk: 55, confidence: "ambiguous" },
  { id: "ph5", type: "phone", label: "+91 99••• 5541", sublabel: "Owner: N. Verma", risk: 47, confidence: "high" },
  { id: "ph6", type: "phone", label: "+91 97••• 3308", sublabel: "Unregistered SIM", risk: 74, confidence: "ambiguous" },
  { id: "ph7", type: "phone", label: "+91 95••• 6620", sublabel: "Burner, 4-day activity", risk: 83, confidence: "ambiguous" },

  { id: "dv1", type: "device", label: "IMEI •••8841", sublabel: "Shared by ph1 & ph6", risk: 86, confidence: "high", tags: ["shared-device"] },

  { id: "ac1", type: "account", label: "A/C ••4471 (mule)", sublabel: "SBI, opened 41d ago", risk: 94, confidence: "high", tags: ["mule"] },
  { id: "ac2", type: "account", label: "A/C ••2290", sublabel: "HDFC", risk: 71, confidence: "high" },
  { id: "ac3", type: "account", label: "A/C ••7712", sublabel: "ICICI", risk: 68, confidence: "high" },
  { id: "ac4", type: "account", label: "A/C ••0093 (mule)", sublabel: "Paytm Bank, dormant→active", risk: 89, confidence: "ambiguous", tags: ["mule"] },
  { id: "ac5", type: "account", label: "A/C ••5541", sublabel: "Axis", risk: 44, confidence: "high" },

  { id: "tw1", type: "tower", label: "Tower 12-C", sublabel: "Sector 18 Market", risk: 30, confidence: "high" },
  { id: "tw2", type: "tower", label: "Tower 44-B", sublabel: "Ring Road East", risk: 22, confidence: "high" },

  { id: "sc1", type: "social", label: "@unknown.a_47", sublabel: "Instagram, public", risk: 60, confidence: "ambiguous" },
  { id: "sc2", type: "social", label: "@r.malhotra.19", sublabel: "X / Twitter", risk: 52, confidence: "high" },
];

// ---------- Graph edges ----------
export const edges: GraphEdge[] = [
  { id: "e1", source: "p1", target: "ph1", kind: "OWNS", confidence: "high", weight: 3, evidenceIds: ["id_0001"] },
  { id: "e2", source: "p2", target: "ph2", kind: "OWNS", confidence: "high", weight: 3, evidenceIds: ["id_0002"] },
  { id: "e3", source: "p3", target: "ph3", kind: "OWNS", confidence: "high", weight: 3, evidenceIds: ["id_0003"] },
  { id: "e4", source: "p4", target: "ph4", kind: "OWNS", confidence: "ambiguous", weight: 2, evidenceIds: ["id_0004"] },
  { id: "e5", source: "p5", target: "ph5", kind: "OWNS", confidence: "high", weight: 3, evidenceIds: ["id_0005"] },

  { id: "e6", source: "ph1", target: "ph2", kind: "CALLED", confidence: "high", weight: 4, evidenceIds: ["cdr_0482", "cdr_0483"] },
  { id: "e7", source: "ph2", target: "ph3", kind: "CALLED", confidence: "high", weight: 3, evidenceIds: ["cdr_0490"] },
  { id: "e8", source: "ph3", target: "ph4", kind: "CALLED", confidence: "ambiguous", weight: 2, evidenceIds: ["cdr_0511"] },
  { id: "e9", source: "ph4", target: "ph5", kind: "CALLED", confidence: "high", weight: 2, evidenceIds: ["cdr_0519"] },
  { id: "e10", source: "ph1", target: "ph6", kind: "SHARED_DEVICE", confidence: "high", weight: 5, evidenceIds: ["ipdr_0071"] },
  { id: "e11", source: "ph6", target: "dv1", kind: "USES", confidence: "high", weight: 3, evidenceIds: ["ipdr_0071"] },
  { id: "e12", source: "ph1", target: "dv1", kind: "USES", confidence: "high", weight: 3, evidenceIds: ["ipdr_0068"] },

  { id: "e13", source: "ac2", target: "ac1", kind: "TRANSFERRED_TO", confidence: "high", weight: 4, evidenceIds: ["txn_0193"] },
  { id: "e14", source: "ac3", target: "ac1", kind: "TRANSFERRED_TO", confidence: "high", weight: 4, evidenceIds: ["txn_0194"] },
  { id: "e15", source: "ac5", target: "ac1", kind: "TRANSFERRED_TO", confidence: "high", weight: 3, evidenceIds: ["txn_0195"] },
  { id: "e16", source: "ac1", target: "ac4", kind: "TRANSFERRED_TO", confidence: "ambiguous", weight: 5, evidenceIds: ["txn_0198"] },

  { id: "e17", source: "ph1", target: "tw1", kind: "LOCATED_AT", confidence: "high", weight: 2, evidenceIds: ["cdr_0501"] },
  { id: "e18", source: "ph3", target: "tw1", kind: "LOCATED_AT", confidence: "high", weight: 2, evidenceIds: ["cdr_0502"] },
  { id: "e19", source: "ph2", target: "tw2", kind: "LOCATED_AT", confidence: "high", weight: 1, evidenceIds: ["cdr_0512"] },

  { id: "e20", source: "p1", target: "sc1", kind: "OWNS", confidence: "ambiguous", weight: 1, evidenceIds: ["soc_0021"] },
  { id: "e21", source: "p2", target: "sc2", kind: "OWNS", confidence: "high", weight: 1, evidenceIds: ["soc_0025"] },
  { id: "e22", source: "sc1", target: "sc2", kind: "MENTIONED", confidence: "ambiguous", weight: 1, evidenceIds: ["soc_0027"] },

  { id: "e23", source: "p3", target: "p4", kind: "CO_OCCURRED", confidence: "ambiguous", weight: 2, evidenceIds: ["cdr_0511", "cdr_0502"] },
];

// ---------- Evidence records ----------
export const evidence: EvidenceRecord[] = [
  {
    id: "txn_0193", source: "Banking",
    summary: "₹48,000 transferred A/C ••2290 → A/C ••4471 via IMPS",
    timestamp: "2026-08-20 14:02:11", hash: "8f21…c30a", ingested: "2026-08-21 09:14:02",
    fields: { channel: "IMPS", amount: 48000, from: "A/C ••2290", to: "A/C ••4471" },
    ruleTriggered: "HIGH_FAN_IN", confidence: 0.92,
  },
  {
    id: "txn_0194", source: "Banking",
    summary: "₹52,500 transferred A/C ••7712 → A/C ••4471 via UPI",
    timestamp: "2026-08-20 14:07:44", hash: "3ab0…91fe", ingested: "2026-08-21 09:14:02",
    fields: { channel: "UPI", amount: 52500, from: "A/C ••7712", to: "A/C ••4471" },
    ruleTriggered: "HIGH_FAN_IN", confidence: 0.92,
  },
  {
    id: "txn_0195", source: "Banking",
    summary: "₹31,200 transferred A/C ••5541 → A/C ••4471 via UPI",
    timestamp: "2026-08-20 14:12:09", hash: "b912…44d1", ingested: "2026-08-21 09:14:02",
    fields: { channel: "UPI", amount: 31200, from: "A/C ••5541", to: "A/C ••4471" },
    ruleTriggered: "HIGH_FAN_IN", confidence: 0.92,
  },
  {
    id: "txn_0198", source: "Banking",
    summary: "₹1,26,800 onward transfer A/C ••4471 → A/C ••0093 (dormant 118d, then active)",
    timestamp: "2026-08-20 14:19:52", hash: "d004…7ac2", ingested: "2026-08-21 09:14:03",
    fields: { channel: "NEFT", amount: 126800, from: "A/C ••4471", to: "A/C ••0093" },
    ruleTriggered: "DORMANT_REACTIVATION", confidence: 0.88,
  },
  {
    id: "cdr_0482", source: "CDR",
    summary: "Call +91 98•••4471 → +91 96•••2290, 4m12s",
    timestamp: "2026-08-20 13:41:03", hash: "77ac…10bb", ingested: "2026-08-21 09:10:41",
    fields: { duration_s: 252, tower: "Tower 12-C", type: "voice" },
  },
  {
    id: "cdr_0483", source: "CDR",
    summary: "Call +91 96•••2290 → +91 98•••4471, 1m05s (callback)",
    timestamp: "2026-08-20 13:47:20", hash: "9e10…22c4", ingested: "2026-08-21 09:10:41",
    fields: { duration_s: 65, tower: "Tower 12-C", type: "voice" },
  },
  {
    id: "cdr_0490", source: "CDR",
    summary: "Call +91 96•••2290 → +91 90•••7712, 2m40s",
    timestamp: "2026-08-20 13:52:10", hash: "1c40…d9ee", ingested: "2026-08-21 09:10:42",
    fields: { duration_s: 160, tower: "Tower 12-C", type: "voice" },
  },
  {
    id: "cdr_0501", source: "CDR", summary: "+91 98•••4471 registered at Tower 12-C (5 occasions)",
    timestamp: "2026-08-20 13:30–14:20", hash: "a501…09cd", ingested: "2026-08-21 09:11:02",
    fields: { tower: "Tower 12-C", occasions: 5 }, ruleTriggered: "LOCATION_COOCCURRENCE", confidence: 0.88,
  },
  {
    id: "cdr_0502", source: "CDR", summary: "+91 90•••7712 registered at Tower 12-C (5 occasions)",
    timestamp: "2026-08-20 13:31–14:22", hash: "b502…10de", ingested: "2026-08-21 09:11:03",
    fields: { tower: "Tower 12-C", occasions: 5 }, ruleTriggered: "LOCATION_COOCCURRENCE", confidence: 0.88,
  },
  {
    id: "cdr_0511", source: "CDR", summary: "Call +91 90•••7712 → +91 88•••0093, 0m48s",
    timestamp: "2026-08-20 14:26:33", hash: "cc11…7fa0", ingested: "2026-08-21 09:11:40",
    fields: { duration_s: 48, tower: "Tower 44-B", type: "voice" },
  },
  {
    id: "cdr_0512", source: "CDR", summary: "+91 96•••2290 registered at Tower 44-B",
    timestamp: "2026-08-20 14:30:02", hash: "cd12…8fb1", ingested: "2026-08-21 09:11:41",
    fields: { tower: "Tower 44-B" },
  },
  {
    id: "cdr_0519", source: "CDR", summary: "Call +91 88•••0093 → +91 99•••5541, 3m21s",
    timestamp: "2026-08-20 14:41:55", hash: "9f19…22aa", ingested: "2026-08-21 09:12:10",
    fields: { duration_s: 201, tower: "Tower 44-B", type: "voice" },
  },
  {
    id: "ipdr_0068", source: "IPDR", summary: "Session: +91 98•••4471 on IMEI •••8841, 41 min",
    timestamp: "2026-08-20 13:12:00", hash: "12dd…001a", ingested: "2026-08-21 09:09:15",
    fields: { imei: "•••8841", bytes: "18.2 MB", apn: "airtel4g" },
  },
  {
    id: "ipdr_0071", source: "IPDR", summary: "Same IMEI •••8841 also used by SIM +91 97•••3308 within 3h window",
    timestamp: "2026-08-20 16:02:00", hash: "44ee…0912", ingested: "2026-08-21 09:09:41",
    fields: { imei: "•••8841", bytes: "9.7 MB", apn: "airtel4g" },
    ruleTriggered: "SHARED_DEVICE", confidence: 0.95,
  },
  {
    id: "soc_0021", source: "Social", summary: "Public post from @unknown.a_47 tagging Sector 18 Market, 14:33",
    timestamp: "2026-08-20 14:33:09", hash: "77aa…5c10", ingested: "2026-08-21 09:20:11",
    fields: { platform: "Instagram", geotag: "Sector 18 Market" },
  },
  {
    id: "soc_0025", source: "Social", summary: "Post by @r.malhotra.19 referencing 'settled, moving it now'",
    timestamp: "2026-08-20 14:35:47", hash: "88bb…6d21", ingested: "2026-08-21 09:20:44",
    fields: { platform: "X" },
  },
  {
    id: "soc_0027", source: "Social", summary: "@unknown.a_47 mentioned by @r.malhotra.19 in reply thread",
    timestamp: "2026-08-20 14:36:02", hash: "99cc…7e32", ingested: "2026-08-21 09:20:50",
    fields: { platform: "X" },
  },
  {
    id: "id_0001", source: "Identity", summary: "SIM +91 98•••4471 KYC on file, address partial match",
    timestamp: "2026-06-02", hash: "0a1b…f421", ingested: "2026-08-21 08:55:02",
    fields: { kyc_status: "partial" },
  },
  {
    id: "id_0002", source: "Identity", summary: "SIM +91 96•••2290 KYC verified — R. Malhotra",
    timestamp: "2026-05-11", hash: "0b2c…f532", ingested: "2026-08-21 08:55:09",
    fields: { kyc_status: "verified" },
  },
  {
    id: "id_0003", source: "Identity", summary: "SIM +91 90•••7712 KYC verified — K. Sethi",
    timestamp: "2026-04-29", hash: "0c3d…f643", ingested: "2026-08-21 08:55:14",
    fields: { kyc_status: "verified" },
  },
  {
    id: "id_0004", source: "Identity", summary: "SIM +91 88•••0093 KYC pending re-verification",
    timestamp: "2026-03-02", hash: "0d4e…f754", ingested: "2026-08-21 08:55:19",
    fields: { kyc_status: "pending" },
  },
  {
    id: "id_0005", source: "Identity", summary: "SIM +91 99•••5541 KYC verified — N. Verma",
    timestamp: "2026-02-18", hash: "0e5f…f865", ingested: "2026-08-21 08:55:24",
    fields: { kyc_status: "verified" },
  },
];

export const evidenceById = Object.fromEntries(evidence.map((e) => [e.id, e]));

// ---------- Timeline ----------
export const timeline: TimelineEvent[] = [
  {
    id: "t1", timestamp: "2026-08-20 13:41:03", title: "First contact",
    description: "Unknown Subject A calls R. Malhotra for 4m12s from Tower 12-C.",
    source: "CDR", entityIds: ["ph1", "ph2"], evidenceIds: ["cdr_0482"], severity: "info",
  },
  {
    id: "t2", timestamp: "2026-08-20 13:52:10", title: "Chain call to Sethi",
    description: "R. Malhotra calls K. Sethi 2m40s — same tower sector as Subject A.",
    source: "CDR", entityIds: ["ph2", "ph3"], evidenceIds: ["cdr_0490"], severity: "info",
  },
  {
    id: "t3", timestamp: "2026-08-20 14:02:11", title: "Fan-in transfer begins",
    description: "₹48,000 moves from Malhotra's account into the mule account ••4471.",
    source: "Banking", entityIds: ["ac2", "ac1"], evidenceIds: ["txn_0193"], severity: "watch",
  },
  {
    id: "t4", timestamp: "2026-08-20 14:07:44", title: "Second fan-in transfer",
    description: "₹52,500 arrives from Sethi's account into ••4471, 5 minutes later.",
    source: "Banking", entityIds: ["ac3", "ac1"], evidenceIds: ["txn_0194"], severity: "watch",
  },
  {
    id: "t5", timestamp: "2026-08-20 14:12:09", title: "Third fan-in transfer",
    description: "₹31,200 arrives from Verma's account — three unrelated sources converge in 18 minutes.",
    source: "Banking", entityIds: ["ac5", "ac1"], evidenceIds: ["txn_0195"], severity: "high",
  },
  {
    id: "t6", timestamp: "2026-08-20 14:19:52", title: "Onward transfer to dormant account",
    description: "₹1,26,800 pushed out to account ••0093, dormant for 118 days before this transaction.",
    source: "Banking", entityIds: ["ac1", "ac4"], evidenceIds: ["txn_0198"], severity: "high",
  },
  {
    id: "t7", timestamp: "2026-08-20 14:26:33", title: "Bridge call to Subject B",
    description: "K. Sethi calls Unknown Subject B — the only link between the two clusters.",
    source: "CDR", entityIds: ["ph3", "ph4"], evidenceIds: ["cdr_0511"], severity: "watch",
  },
  {
    id: "t8", timestamp: "2026-08-20 14:33:09", title: "Geotagged public post",
    description: "@unknown.a_47 posts publicly, geotagged at Sector 18 Market — same window as the transfers.",
    source: "Social", entityIds: ["sc1"], evidenceIds: ["soc_0021"], severity: "info",
  },
  {
    id: "t9", timestamp: "2026-08-20 14:35:47", title: "Corroborating social signal",
    description: "R. Malhotra posts \"settled, moving it now\" within 3 minutes of the geotagged post.",
    source: "Social", entityIds: ["sc2"], evidenceIds: ["soc_0025"], severity: "high",
  },
  {
    id: "t10", timestamp: "2026-08-20 16:02:00", title: "Shared device surfaces",
    description: "IMEI •••8841 — used by Subject A's phone — reappears under a different, unregistered SIM.",
    source: "IPDR", entityIds: ["dv1", "ph6"], evidenceIds: ["ipdr_0071"], severity: "high",
  },
];

// ---------- Story claims (Investigation Story Mode) ----------
export const storyClaims: StoryClaim[] = [
  {
    id: "c1",
    text: "Account ••4471 received transfers from 3 unrelated accounts within 18 minutes.",
    evidenceIds: ["txn_0193", "txn_0194", "txn_0195"], confidence: 0.92, rule: "HIGH_FAN_IN",
  },
  {
    id: "c2",
    text: "The same account pushed ₹1,26,800 onward to a dormant account reactivated the same day.",
    evidenceIds: ["txn_0198"], confidence: 0.88, rule: "DORMANT_REACTIVATION",
  },
  {
    id: "c3",
    text: "Subject A and K. Sethi's phones co-registered at Tower 12-C on 5 occasions during the transfer window.",
    evidenceIds: ["cdr_0501", "cdr_0502"], confidence: 0.88, rule: "LOCATION_COOCCURRENCE",
  },
  {
    id: "c4",
    text: "IMEI •••8841 links Subject A's registered phone to an unregistered SIM active 3 hours later — the same physical device.",
    evidenceIds: ["ipdr_0068", "ipdr_0071"], confidence: 0.95, rule: "SHARED_DEVICE",
  },
  {
    id: "c5",
    text: "A public post geotagged at Sector 18 Market was followed 3 minutes later by a corroborating post from R. Malhotra.",
    evidenceIds: ["soc_0021", "soc_0025"], confidence: 0.71, rule: "TEMPORAL_SOCIAL_CORRELATION",
  },
];

// ---------- Copilot conversation seed ----------
// ---------- Dashboard: alerts & activity ----------
export interface AlertItem {
  id: string;
  caseId: string;
  title: string;
  rule: string;
  severity: "high" | "watch" | "info";
  time: string;
  evidenceIds: string[];
}

export const alerts: AlertItem[] = [
  { id: "al1", caseId: "2047", title: "High fan-in detected on A/C ••4471", rule: "HIGH_FAN_IN", severity: "high", time: "12 min ago", evidenceIds: ["txn_0193", "txn_0194", "txn_0195"] },
  { id: "al2", caseId: "2047", title: "Dormant account reactivated (118d) then moved ₹1.26L", rule: "DORMANT_REACTIVATION", severity: "high", time: "18 min ago", evidenceIds: ["txn_0198"] },
  { id: "al3", caseId: "2047", title: "Shared IMEI across two SIMs", rule: "SHARED_DEVICE", severity: "high", time: "31 min ago", evidenceIds: ["ipdr_0071"] },
  { id: "al4", caseId: "1988", title: "Cluster of 6 accounts messaging same phishing link", rule: "COORDINATED_MESSAGING", severity: "watch", time: "1 hr ago", evidenceIds: [] },
  { id: "al5", caseId: "2047", title: "Location co-occurrence, Tower 12-C (5x)", rule: "LOCATION_COOCCURRENCE", severity: "watch", time: "2 hr ago", evidenceIds: ["cdr_0501", "cdr_0502"] },
  { id: "al6", caseId: "1954", title: "Circular transfer pattern flagged for review", rule: "CIRCULAR_TRANSFER", severity: "info", time: "5 hr ago", evidenceIds: [] },
];

export const weeklyActivity = [
  { day: "Tue", fullDate: "Tue, May 13", alerts: 18, resolved: 12 },
  { day: "Wed", fullDate: "Wed, May 14", alerts: 24, resolved: 16 },
  { day: "Thu", fullDate: "Thu, May 15", alerts: 20, resolved: 22 },
  { day: "Fri", fullDate: "Fri, May 16", alerts: 32, resolved: 18 },
  { day: "Sat", fullDate: "Sat, May 17", alerts: 28, resolved: 26 },
  { day: "Sun", fullDate: "Sun, May 18", alerts: 35, resolved: 29 },
  { day: "Mon", fullDate: "Mon, May 19", alerts: 44, resolved: 38 },
];

export const copilotSeed: CopilotMessage[] = [
  {
    id: "m1", role: "analyst",
    text: "Why is account ••4471 flagged?",
  },
  {
    id: "m2", role: "evidra",
    text:
      "Account ••4471 has a risk score of 87/100 for three cited reasons:",
    claims: storyClaims.slice(0, 3),
    suggestions: [
      "Show the shortest path between Subject A and K. Sethi",
      "Who else shares IMEI •••8841?",
      "Generate the case report",
    ],
  },
];
