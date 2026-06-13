"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { fetchSurveyAudioUrl, hasSurveyAudio } from "@/lib/audioRecording";

type Props = {
  surveyId: number;
  hasAudio: boolean;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function FieldRecordAudio({ surveyId, hasAudio }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!hasAudio) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchSurveyAudioUrl(surveyId)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [surveyId, hasAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    const onTime = () => {
      if (!draggingRef.current) setCurrent(audio.currentTime);
    };
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [src]);

  const seekFromClientX = useCallback((clientX: number) => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track || duration <= 0) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const next = ratio * duration;
    audio.currentTime = next;
    setCurrent(next);
  }, [duration]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      seekFromClientX(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current || !e.touches[0]) return;
      seekFromClientX(e.touches[0].clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [seekFromClientX]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (playing) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch {
      setError(true);
    }
  };

  if (!hasAudio) {
    return <span className="ps-field-records-badge is-muted">Silent</span>;
  }

  if (loading) {
    return <span className="ps-audio-loading">Loading…</span>;
  }

  if (error || !src) {
    return (
      <span className="ps-field-records-badge is-muted" title="Could not load audio">
        Silent
      </span>
    );
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="ps-audio-cell">
      <audio ref={audioRef} preload="metadata" src={src} className="ps-audio-hidden" />
      <button
        type="button"
        className={`ps-audio-play-btn${playing ? " is-playing" : ""}`}
        onClick={togglePlay}
        aria-label={playing ? "Pause audio" : "Play audio"}
      >
        {playing ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
      </button>
      <div className="ps-audio-track-wrap">
        <div
          ref={trackRef}
          className="ps-audio-track"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={current}
          aria-label="Audio position"
          onMouseDown={(e) => {
            draggingRef.current = true;
            seekFromClientX(e.clientX);
          }}
          onTouchStart={(e) => {
            draggingRef.current = true;
            if (e.touches[0]) seekFromClientX(e.touches[0].clientX);
          }}
          onClick={(e) => seekFromClientX(e.clientX)}
        >
          <div className="ps-audio-track-fill" style={{ width: `${progress}%` }} />
          <div className="ps-audio-track-thumb" style={{ left: `${progress}%` }} />
        </div>
        <span className="ps-audio-time">
          {formatTime(current)}
          {duration > 0 ? ` / ${formatTime(duration)}` : ""}
        </span>
      </div>
    </div>
  );
}

export { hasSurveyAudio };
