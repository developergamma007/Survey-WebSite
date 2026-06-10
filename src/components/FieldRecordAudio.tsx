"use client";

import { useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { fetchSurveyAudioUrl } from "@/lib/audioRecording";

type Props = {
  surveyId: number;
  hasAudio: boolean;
};

export function FieldRecordAudio({ surveyId, hasAudio }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  if (!hasAudio) {
    return <span className="ps-field-records-badge is-muted">Silent</span>;
  }

  const stopPlayback = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
  };

  const handleToggle = async () => {
    if (playing) {
      stopPlayback();
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const url = await fetchSurveyAudioUrl(surveyId);
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio();
        audio.preload = "none";
        audio.onended = () => setPlaying(false);
        audioRef.current = audio;
      }
      audio.src = url;
      await audio.play();
      setPlaying(true);
    } catch {
      setError(true);
      stopPlayback();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ps-audio-cell">
      <button
        type="button"
        className={`ps-audio-play-btn${playing ? " is-playing" : ""}${error ? " is-error" : ""}`}
        onClick={handleToggle}
        disabled={loading}
        title={error ? "Could not load audio" : playing ? "Stop" : "Play recording"}
        aria-label={playing ? "Stop audio" : "Play audio"}
      >
        {loading ? (
          <span className="ps-audio-play-spinner" />
        ) : playing ? (
          <Square size={10} fill="currentColor" />
        ) : (
          <Play size={11} fill="currentColor" />
        )}
      </button>
    </div>
  );
}
