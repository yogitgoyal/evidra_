"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBanking, listBanking, BankingRecord } from "@/lib/api";

export default function CaseBankingPage() {
  const params = useParams();
  const caseId = params?.id as string;

  const [sender, setSender] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState("UPI");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<BankingRecord[]>([]);

  async function loadRecords() {
    try {
      const data = await listBanking(caseId);
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load banking records.");
    }
  }

  useEffect(() => {
    if (caseId) loadRecords();
  }, [caseId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sender.trim() || !recipient.trim() || !amount.trim()) {
      setError("Sender, recipient, and amount are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createBanking(caseId, {
        sender,
        recipient,
        amount: parseFloat(amount),
        channel,
      });
      setSender("");
      setRecipient("");
      setAmount("");
      await loadRecords();
    } catch (err) {
      setError("Failed to add record. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      <h1 className="text-xl font-semibold text-text">Add Banking Records</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border-soft bg-surface p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-text-faint">Sender Account/UPI</label>
            <input
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="e.g. sender@upi"
              className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-faint">Recipient Account/UPI</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. recipient@upi"
              className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-text-faint">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-faint">Channel</label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="e.g. UPI, NEFT, IMPS"
              className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Record"}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-text-faint uppercase tracking-wide">
          Records ({records.length})
        </h2>
        <div className="space-y-2">
          {records.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm"
            >
              <span className="text-text">
                {r.sender} → {r.recipient}
              </span>
              <span className="text-text-faint">₹{r.amount} ({r.channel})</span>
            </div>
          ))}
          {records.length === 0 && (
            <p className="text-sm text-text-faint">No records yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}