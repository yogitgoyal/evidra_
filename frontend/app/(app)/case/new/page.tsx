"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCase } from "@/lib/api";

export default function NewCasePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Case name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await createCase({ name });
      router.push(`/case/${created.id}`);
    } catch (err) {
      setError("Failed to create case. Check that the backend is running.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="mb-6 text-xl font-semibold text-text">New Case</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-text-faint">Case Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fan-in Mule Network, Sector 18"
            className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Case"}
        </button>
      </form>
    </div>
  );
}