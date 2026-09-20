"use client";

import { ClueType, toIstTimestamp } from "@/lib/api";

const clueOptions: Array<{ value: ClueType; label: string }> = [
  { value: "transaction_id", label: "Transaction ID" },
  { value: "upi_ref", label: "UPI reference" },
  { value: "phone", label: "Phone" },
  { value: "ip", label: "IP" },
  { value: "amount_time", label: "Amount + time" },
];

export function validateClue(type: ClueType | "", value: string, amount: string, timestamp: string): string | null {
  if (!type) return value.trim() || amount.trim() || timestamp ? "Choose a clue type or clear the clue fields." : null;
  if (type === "amount_time") {
    if (!amount.trim() || !timestamp) return "Amount and time are both required.";
    if (!/^\d+(\.\d+)?$/.test(amount.trim()) || Number(amount) < 0) return "Amount must be a non-negative decimal.";
    return null;
  }
  if (!value.trim()) return "Clue value is required.";
  if (type === "phone" && (!/^\d+$/.test(value.trim()) || value.trim().length < 7)) return "Phone must contain at least 7 digits.";
  if (type === "ip") {
    const parts = value.trim().split(".");
    const validIpv4 = parts.length === 4 && parts.every((part) => /^\d+$/.test(part) && Number(part) <= 255);
    if (!validIpv4 && !value.includes(":")) return "Enter a valid IPv4 or IPv6 address.";
  }
  return null;
}

export function clueValue(type: ClueType | "", value: string, amount: string, timestamp: string): string | undefined {
  if (!type) return undefined;
  if (type === "amount_time") return `${amount.trim()}|${toIstTimestamp(timestamp)}`;
  return value.trim();
}

export function EvidenceClueFields({
  type,
  value,
  amount,
  timestamp,
  onTypeChange,
  onValueChange,
  onAmountChange,
  onTimestampChange,
  error,
  compact = false,
}: {
  type: ClueType | "";
  value: string;
  amount: string;
  timestamp: string;
  onTypeChange: (value: ClueType | "") => void;
  onValueChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onTimestampChange: (value: string) => void;
  error?: string | null;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium text-text-faint">
          Clue type (optional)
          <select value={type} onChange={(event) => onTypeChange(event.target.value as ClueType | "")} className="mt-1.5 w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm text-text">
            <option value="">No clue - use evidence types only</option>
            {clueOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        {type === "amount_time" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-text-faint">Amount<input type="text" inputMode="decimal" value={amount} onChange={(event) => onAmountChange(event.target.value)} placeholder="5000.00" className="mt-1.5 w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm text-text" /></label>
            <label className="text-xs font-medium text-text-faint">Time (IST)<input type="datetime-local" value={timestamp} onChange={(event) => onTimestampChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm text-text" /></label>
          </div>
        ) : type ? (
          <label className="text-xs font-medium text-text-faint">Clue value<input value={value} onChange={(event) => onValueChange(event.target.value)} placeholder={type === "phone" ? "9876500001" : type === "ip" ? "192.0.2.1" : "Reference value"} className="mt-1.5 w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm text-text" /></label>
        ) : <div className={compact ? "hidden sm:block" : "text-xs text-text-faint sm:pt-7"}>Add a clue to discover candidate starting entities.</div>}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}