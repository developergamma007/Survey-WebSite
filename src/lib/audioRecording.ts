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

export function finalizeMediaRecorder(
  recorder: MediaRecorder | null,
  chunks: BlobPart[],
  fallback: string | null = null,
  blobType = "audio/webm"
): Promise<string | null> {
  return new Promise((resolve) => {
    if (!recorder || recorder.state === "inactive") {
      resolve(fallback);
      return;
    }

    recorder.onstop = () => {
      try {
        recorder.stream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }

      const blob = new Blob(chunks, { type: blobType });
      if (blob.size === 0) {
        resolve(fallback);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || fallback);
      reader.onerror = () => resolve(fallback);
      reader.readAsDataURL(blob);
    };

    try {
      recorder.requestData();
    } catch {
      // Some browsers don't support requestData before stop.
    }
    recorder.stop();
  });
}
