"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MapPinned } from "lucide-react";
import { getGeo, GeoEvent } from "@/lib/api";
import { Card, SectionLabel } from "@/components/ui/primitives";

export default function GeospatialPage() {
  const params = useParams();
  const caseId = params?.id as string;
  const [locations, setLocations] = useState<GeoEvent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) return;
    getGeo(caseId).then(setLocations).catch((err: Error) => setError(err.message));
  }, [caseId]);

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 space-y-6 px-6 py-8 lg:px-8">
      <div className="flex items-center gap-2"><MapPinned size={16} className="text-cyan" /><h1 className="text-xl font-semibold text-text">Geospatial View</h1></div>
      <p className="text-sm text-text-dim">Locations derived from this case&apos;s source-record attributes.</p>
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <Card className="p-6">
        <SectionLabel className="mb-4">CASE LOCATIONS</SectionLabel>
        {locations.length === 0 ? <p className="text-sm text-text-dim">No location attributes are available for this case.</p> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {locations.map((location) => (
              <div key={location.id} className="rounded-lg border border-border-soft bg-bg-raised p-4">
                <div className="font-medium text-text">{location.title}</div>
                <div className="mt-1 font-mono text-xs text-text-dim">{location.latitude}, {location.longitude}</div>
                <div className="mt-2 text-xs text-text-faint">{location.source} · {location.timestamp}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
