"use client";

import { Suspense, use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";
import { fetchSurveyorProfile, getStoredToken, clearSurveyorSession } from "@/lib/surveyorSession";
import { isResponsesAdmin } from "@/lib/adminUsers";

function SurveyAudioPortalInner({ surveyId }: { surveyId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantDownload = searchParams.get("download") === "1";
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string>("Loading audio…");
  const [playUrl, setPlayUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getStoredToken();
      const returnPath = `/responses/audio/${surveyId}${wantDownload ? "?download=1" : ""}`;

      if (!token) {
        router.replace(`/login?return=${encodeURIComponent(returnPath)}`);
        return;
      }

      try {
        const profile = await fetchSurveyorProfile(token);
        if (!isResponsesAdmin(profile.username)) {
          clearSurveyorSession();
          router.replace(`/login?return=${encodeURIComponent(returnPath)}`);
          return;
        }

        if (wantDownload) {
          const res = await fetch(`${API_BASE_URL}/api/responses/${surveyId}/audio/download`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            throw new Error("Download failed");
          }
          const blob = await res.blob();
          const disposition = res.headers.get("Content-Disposition") || "";
          const match = disposition.match(/filename="([^"]+)"/i);
          const filename = match?.[1] || `survey-${surveyId}.webm`;
          const objectUrl = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = objectUrl;
          anchor.download = filename;
          anchor.click();
          URL.revokeObjectURL(objectUrl);
          if (!cancelled) {
            setStatus("ready");
            setMessage(`Download started for ${filename}. You can play it below or return to records.`);
          }
        }

        const meta = await fetch(`${API_BASE_URL}/api/responses/${surveyId}/audio`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meta.ok) {
          throw new Error("Could not load audio");
        }
        const data = (await meta.json()) as { url: string };
        if (!cancelled) {
          setPlayUrl(data.url);
          setStatus("ready");
          if (!wantDownload) {
            setMessage("Survey audio — press play below.");
          }
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not load this survey audio. Check your login or try again from Field Records.");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, surveyId, wantDownload]);

  useEffect(() => {
    if (!wantDownload || !playUrl || !audioRef.current) return;
    audioRef.current.load();
  }, [wantDownload, playUrl]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">Survey audio</p>
        <h1 className="text-xl font-black mb-2">Submission #{surveyId}</h1>
        <p className={`text-sm mb-6 ${status === "error" ? "text-red-400" : "text-slate-400"}`}>{message}</p>

        {playUrl && status === "ready" ? (
          <audio
            ref={audioRef}
            src={playUrl}
            controls
            autoPlay={!wantDownload}
            className="w-full mb-6"
          />
        ) : null}

        <Link
          href="/responses?tab=list"
          className="inline-flex text-sm font-bold text-emerald-400 hover:text-emerald-300"
        >
          ← Back to field records
        </Link>
      </div>
    </div>
  );
}

function SurveyAudioPortal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const surveyId = Number.parseInt(id, 10);

  if (!Number.isFinite(surveyId) || surveyId <= 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-red-400 flex items-center justify-center">
        Invalid survey id
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
          Loading…
        </div>
      }
    >
      <SurveyAudioPortalInner surveyId={surveyId} />
    </Suspense>
  );
}

export default SurveyAudioPortal;
