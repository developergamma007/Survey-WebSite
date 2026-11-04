import axios from "axios";
import { API_BASE_URL } from "@/lib/config";

/** Parse data URLs from FileReader (incl. Safari `data:audio/mp4;codecs=…;base64,`). */
function dataUrlToBlob(dataUrl: string): Blob {
  const trimmed = dataUrl.trim();
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx === -1 || !trimmed.startsWith("data:")) {
    throw new Error("Invalid audio data URL");
  }
  const meta = trimmed.slice(0, commaIdx);
  const payload = trimmed.slice(commaIdx + 1);
  if (!/;base64/i.test(meta)) {
    throw new Error("Invalid audio data URL");
  }
  const mime = meta.slice(5).split(";")[0]?.trim() || "application/octet-stream";
  const binary = atob(payload.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function recordingToBlob(input: string | Blob): Promise<Blob> {
  if (input instanceof Blob) {
    if (input.size === 0) {
      throw new Error("Invalid audio data URL");
    }
    return input;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Invalid audio data URL");
  }
  if (trimmed.startsWith("blob:")) {
    const res = await fetch(trimmed);
    if (!res.ok) {
      throw new Error("Invalid audio data URL");
    }
    const blob = await res.blob();
    if (blob.size === 0) {
      throw new Error("Invalid audio data URL");
    }
    return blob;
  }
  if (trimmed.startsWith("data:")) {
    return dataUrlToBlob(trimmed);
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 64) {
    return dataUrlToBlob(`data:audio/webm;base64,${trimmed.replace(/\s/g, "")}`);
  }
  throw new Error("Invalid audio data URL");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:")) {
        resolve(result);
        return;
      }
      reject(new Error("Invalid audio data URL"));
    };
    reader.onerror = () => reject(new Error("Invalid audio data URL"));
    reader.readAsDataURL(blob);
  });
}

export async function uploadSurveyAudio(
  recordedAudio: string | Blob | null,
  token?: string | null
): Promise<{ audioKey?: string; audio_base64?: string | null }> {
  if (!recordedAudio) {
    return { audio_base64: null };
  }

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const blob = await recordingToBlob(recordedAudio);
  const baseMime = (blob.type || "").split(";")[0].toLowerCase();
  let ext = "webm";
  let fileMime = "audio/webm";
  if (baseMime.includes("mp4") || baseMime.includes("m4a") || baseMime.includes("aac")) {
    ext = "m4a";
    fileMime = baseMime.startsWith("audio/") ? baseMime : "audio/mp4";
  } else if (baseMime.includes("webm")) {
    ext = "webm";
    fileMime = baseMime;
  } else if (baseMime.startsWith("audio/")) {
    ext = baseMime.slice(6) || "webm";
    fileMime = baseMime;
  }
  const uploadBlob = blob.type ? blob : new Blob([await blob.arrayBuffer()], { type: fileMime });
  const formData = new FormData();
  formData.append("audio", uploadBlob, `recording.${ext}`);

  try {
    const res = await axios.post<{ audioKey: string }>(
      `${API_BASE_URL}/api/surveys/upload-audio`,
      formData,
      { headers }
    );
    return { audioKey: res.data.audioKey };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 413) {
      throw new Error(
        "Audio upload is too large for the server. Please submit again with a shorter recording or increase the backend upload limit."
      );
    }
    if (axios.isAxiosError(error) && error.response?.status === 503) {
      const dataUrl =
        typeof recordedAudio === "string" && recordedAudio.startsWith("data:")
          ? recordedAudio
          : await blobToDataUrl(blob);
      return { audio_base64: dataUrl };
    }
    throw error;
  }
}
