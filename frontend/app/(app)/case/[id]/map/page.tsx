"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { MapPinned } from "lucide-react";
import { getCase, getGeo, GeoEvent, GeoResponse, CaseApiResponse } from "@/lib/api";
import { Card, SectionLabel } from "@/components/ui/primitives";

type MapLayer = { remove: () => void };
type MapInstance = {
  fitBounds: (bounds: unknown, options?: unknown) => void;
  getContainer: () => HTMLElement;
  invalidateSize: () => void;
  remove: () => void;
  setView: (center: [number, number], zoom: number) => void;
};

function EventMap({ points, geo, windowOnly }: { points: GeoEvent[]; geo: GeoResponse | null; windowOnly: boolean }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<MapInstance | null>(null);
  const layers = useRef<MapLayer[]>([]);
  const visiblePoints = useMemo(() => points.filter((point) => !windowOnly || point.in_event_window), [points, windowOnly]);
  const validPoints = useMemo(
    () => visiblePoints.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)),
    [visiblePoints],
  );

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;
    (async () => {
      // Leaflet is already an application dependency, but this repo does not ship its optional type package.
      // @ts-expect-error Leaflet runtime is installed without bundled declarations.
      const leaflet = await import("leaflet");
      if (cancelled || !mapRef.current) return;
      if (!mapInstance.current) {
        const createdMap = leaflet.map(mapRef.current);
        mapInstance.current = createdMap;
        const eventCenter = geo?.event_circle && Number.isFinite(geo.event_circle.center_lat) && Number.isFinite(geo.event_circle.center_lng)
          ? [geo.event_circle.center_lat, geo.event_circle.center_lng] as [number, number]
          : null;
        const firstPoint = validPoints[0];
        const pointCenter = firstPoint ? [firstPoint.latitude, firstPoint.longitude] as [number, number] : null;
        createdMap.setView(eventCenter ?? pointCenter ?? [22.5, 79], eventCenter || pointCenter ? 12 : 5);
        leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(createdMap);
      }
      const map = mapInstance.current;
      if (!map) return;
      map.invalidateSize();
      layers.current.forEach((layer) => layer.remove());
      layers.current = [];
      let eventBounds: unknown = null;
      if (geo?.event_circle) {
        try {
          const { center_lat: latitude, center_lng: longitude, radius_m: radius } = geo.event_circle;
          const center = leaflet.latLng(latitude, longitude);
          const circle = leaflet.circle(center, {
            radius,
            color: "#2f5fe0",
            fillColor: "#2f5fe0",
            fillOpacity: 0.12,
          }).addTo(map);
          layers.current.push(circle);
          eventBounds = center.toBounds(radius * 2);
        } catch (error) {
          console.error("Failed to draw event circle", error);
        }
      }
      validPoints.forEach((point) => {
        try {
          const marker = leaflet.circleMarker([point.latitude, point.longitude], {
            radius: 7,
            color: point.in_event_location === true ? "#16874f" : "#d97a06",
            fillColor: point.in_event_location === true ? "#16874f" : "#d97a06",
            fillOpacity: point.in_event_window === false ? 0.18 : 0.85,
            opacity: point.in_event_window === false ? 0.35 : 1,
          }).bindTooltip(point.title).addTo(map);
          layers.current.push(marker);
        } catch (error) {
          console.error(`Failed to draw map point ${point.id}`, error);
        }
      });
      if (eventBounds) map.fitBounds(eventBounds, { padding: [24, 24] });
      else if (validPoints.length > 1) map.fitBounds(leaflet.latLngBounds(validPoints.map((point) => [point.latitude, point.longitude])), { padding: [24, 24] });
    })();
    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
      layers.current = [];
    };
  }, [geo, validPoints]);

  return <div ref={mapRef} className="h-[360px] w-full overflow-hidden rounded-lg" />;
}

export default function GeospatialPage() {
  const params = useParams();
  const caseId = params?.id as string;
  const [locations, setLocations] = useState<GeoEvent[]>([]);
  const [geo, setGeo] = useState<GeoResponse | null>(null);
  const [caseData, setCaseData] = useState<CaseApiResponse | null>(null);
  const [windowOnly, setWindowOnly] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) return;
    Promise.all([getGeo(caseId), getCase(caseId)]).then(([nextGeo, nextCase]) => {
      setCaseData(nextCase);
      if (Array.isArray(nextGeo)) setLocations(nextGeo);
      else { setGeo(nextGeo); setLocations(nextGeo.points); }
    }).catch((err: Error) => setError(err.message));
  }, [caseId]);

  const eventCase = caseData?.investigation_mode === "event";
  const insideArea = locations.filter((location) => location.in_event_location === true).length;
  const hasCoordinates = locations.length > 0;

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 space-y-6 px-6 py-8 lg:px-8">
      <div className="flex items-center gap-2"><MapPinned size={16} className="text-cyan" /><h1 className="text-xl font-semibold text-text">Geospatial View</h1></div>
      <p className="text-sm text-text-dim">Locations derived from this case&apos;s source-record attributes.</p>
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {eventCase && <div className="flex flex-wrap items-center gap-3 text-xs text-text-dim">
        <label className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface px-3 py-2"><input type="checkbox" checked={windowOnly} onChange={(event) => setWindowOnly(event.target.checked)} /> Event window only</label>
        {caseData.event_location && !caseData.event_lat && <span>Add coordinates to this case to draw the event area.</span>}
      </div>}
      <Card className="p-6">
        <SectionLabel className="mb-4">CASE LOCATIONS</SectionLabel>
        {eventCase && !hasCoordinates ? <p className="text-sm text-text-dim">Map points need CDR records with latitude/longitude</p> : eventCase && geo?.event_circle ? <>
          <EventMap points={locations} geo={geo} windowOnly={windowOnly} />
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-dim"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-green-600" />Inside area</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-600" />Outside area</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-gray-400" />Outside time window</span><span>{insideArea} of {locations.length} CDR points inside the area</span></div>
        </> : !eventCase && hasCoordinates ? <EventMap points={locations} geo={null} windowOnly={false} /> : locations.length === 0 ? <p className="text-sm text-text-dim">No location attributes are available for this case.</p> : (
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
