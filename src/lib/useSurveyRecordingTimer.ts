import { useEffect, useState } from "react";
import { MAX_SURVEY_AUDIO_SECONDS } from "@/lib/audioLimits";

export function formatSurveyRecordingClock(elapsedSeconds: number): string {
  const clamped = Math.min(Math.max(0, elapsedSeconds), MAX_SURVEY_AUDIO_SECONDS);
  const mm = String(Math.floor(clamped / 60)).padStart(2, "0");
  const ss = String(clamped % 60).padStart(2, "0");
  const capMin = Math.floor(MAX_SURVEY_AUDIO_SECONDS / 60);
  return `${mm}:${ss} / ${capMin}:00`;
}

export function useSurveyRecordingTimer(active: boolean): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    setElapsedSeconds(0);
    const id = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  return elapsedSeconds;
}
