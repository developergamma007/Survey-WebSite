"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, MapPin } from "lucide-react";
import { buildPointsGoogleMap } from "@/lib/googleMap";

export type SurveyMapPoint = {
  id: number;
  name: string;
  surveyor: string;
  assembly: string;
  ward: string;
  gender: string | null;
  latitude: number;
  longitude: number;
  submittedAt: string;
};

function markerColor(gender: string | null) {
  const value = gender?.trim().toLowerCase() || "";
  if (value.startsWith("m")) return "#d946ef";
  if (value.startsWith("f")) return "#fb7185";
  return "#64748b";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] || character);
}

function popupHtml(point: SurveyMapPoint) {
  const rows = [
    ["Surveyor", point.surveyor],
    ["Assembly", point.assembly],
    ["Ward", point.ward],
    ["Gender", point.gender || "Not recorded"],
    ["GPS", `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`],
  ];
  return `<div style="min-width:220px;padding:4px 2px;font-family:Arial,sans-serif;color:#0f172a"><strong style="font-size:14px">${escapeHtml(point.name)}</strong><div style="margin-top:8px;font-size:12px;line-height:1.7">${rows.map(([label, value]) => `<div><span style="color:#64748b">${escapeHtml(label)}:</span> <b>${escapeHtml(value)}</b></div>`).join("")}</div></div>`;
}

export default function SurveyCoverageMap({ points }: { points: SurveyMapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let cleanup: { markers: any[]; infoWindows: any[] } | null = null;

    const renderMap = async () => {
      if (!containerRef.current || !points.length) return;
      setError(null);
      try {
        const result = await buildPointsGoogleMap(containerRef.current, points, {
          getColor: (point) => markerColor(point.gender),
          getPopupHtml: popupHtml,
        });
        if (!active) {
          result.markers.forEach((marker) => marker.setMap(null));
          result.infoWindows.forEach((window) => window.close());
          return;
        }
        cleanup = result;
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Unable to load the map.");
        }
      }
    };

    void renderMap();
    return () => {
      active = false;
      cleanup?.markers.forEach((marker) => marker.setMap(null));
      cleanup?.infoWindows.forEach((window) => window.close());
    };
  }, [points]);

  if (!points.length) {
    return <EmptyMap message="Captured locations will appear here once surveyors submit a location." />;
  }
  if (error) {
    return <EmptyMap message={error} error />;
  }
  return (
    <div
      ref={containerRef}
      className="mt-4 h-[440px] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
      aria-label="Survey GPS coverage map"
    />
  );
}

function EmptyMap({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <div className="mt-4 flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
      <div>
        <span
          className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${error ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"}`}
        >
          {error ? <AlertCircle className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
        </span>
        <p className="mt-2 text-sm font-semibold text-slate-600">{error ? "Map unavailable" : "No GPS-tagged survey responses"}</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500">{message}</p>
      </div>
    </div>
  );
}
