"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createSocial, listSocial, SocialRecord } from "@/lib/api";

export default function CaseSocialPage() {
  const params = useParams();
  const caseId = params?.id as string;

  const [actor, setActor] = useState("");
  const [target, setTarget] = useState("");
  const [platform, setPlatform] = useState("WhatsApp");
  const [interaction, setInteraction] = useState("message");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<SocialRecord[]>([]);

  async function loadRecords() {
    try {
      const data = await listSocial(caseId);
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load social records.");
    }
  }

  useEffect(() => {
    if (caseId) loadRecords();
  }, [caseId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actor.trim() || !target.trim()) {
      setError("Both actor and target are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createSocial(caseId, {
        actor,
        target,
        platform,
        interaction,
      });
      setActor("");
      setTarget("");
      await loadRecords();
    } catch (err) {
      setError("Failed to add record. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      <h1 className="text-xl font-semibold text-text">Add Social Records</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border-soft bg-surface p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-text-faint">Actor (Handle/ID)</label>
            <input
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="e.g. @user123"
              className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-faint">Target (Handle/ID)</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. @user456"
              className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-text-faint">Platform</label>
            <input
              type="text"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="e.g. WhatsApp, Instagram"
              className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-faint">Interaction Type</label>
            <input
              type="text"
              value={interaction}
              onChange={(e) => setInteraction(e.target.value)}
              placeholder="e.g. message, call, follow"
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
                {r.actor} → {r.target}
              </span>
              <span className="text-text-faint">{r.platform} ({r.interaction})</span>
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