import { API_BASE_URL } from "@/lib/config";

export async function fetchSurveyAudioUrl(surveyId: number): Promise<string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`${API_BASE_URL}/api/responses/${surveyId}/audio`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to load audio");
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}

export async function downloadSurveyAudioFile(surveyId: number): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`${API_BASE_URL}/api/responses/${surveyId}/audio/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to download audio");
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
}

export function hasSurveyAudio(row: {
  has_audio?: boolean;
  audio_url?: string | null;
  audio_base64?: string | null;
}): boolean {
  if (row.has_audio) return true;
  if (row.audio_url) return true;
  return Boolean(row.audio_base64 && row.audio_base64.trim().length > 50);
}

export function normalizeAudioSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;
  return `data:audio/webm;base64,${trimmed}`;
}

export type FinalizedSurveyRecording = {
  blob: Blob | null;
  dataUrl: string | null;
};

function blobFromChunks(chunks: BlobPart[], blobType: string): Blob | null {
  if (chunks.length === 0) return null;
  const blob = new Blob(chunks, { type: blobType });
  return blob.size > 0 ? blob : null;
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      resolve(typeof result === "string" && result.startsWith("data:") ? result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/** Prefer `blob` for upload; `dataUrl` is for legacy fallback only. */
export function finalizeSurveyRecording(
  recorder: MediaRecorder | null,
  chunks: BlobPart[],
  fallbackDataUrl: string | null = null,
  blobType = "audio/webm"
): Promise<FinalizedSurveyRecording> {
  return new Promise((resolve) => {
    const finish = async (blob: Blob | null) => {
      if (!blob) {
        resolve({ blob: null, dataUrl: fallbackDataUrl });
        return;
      }
      const dataUrl = (await blobToDataUrl(blob)) ?? fallbackDataUrl;
      resolve({ blob, dataUrl });
    };

    if (!recorder || recorder.state === "inactive") {
      void finish(blobFromChunks(chunks, blobType));
      return;
    }

    recorder.onstop = () => {
      try {
        recorder.stream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      // WebKit can emit the last dataavailable chunk after onstop.
      const assemble = () => void finish(blobFromChunks(chunks, blobType));
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => setTimeout(assemble, 50));
      } else {
        setTimeout(assemble, 50);
      }
    };

    try {
      recorder.requestData();
    } catch {
      // Some browsers don't support requestData before stop.
    }
    recorder.stop();
  });
}

export async function finalizeMediaRecorder(
  recorder: MediaRecorder | null,
  chunks: BlobPart[],
  fallback: string | null = null,
  blobType = "audio/webm"
): Promise<string | null> {
  const { dataUrl } = await finalizeSurveyRecording(recorder, chunks, fallback, blobType);
  return dataUrl;
}
