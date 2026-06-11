import axios from "axios";
import { API_BASE_URL } from "@/lib/config";

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) {
    throw new Error("Invalid audio data URL");
  }
  const mime = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function uploadSurveyAudio(
  recordedAudio: string | null,
  token?: string | null
): Promise<{ audioKey?: string; audio_base64?: string | null }> {
  if (!recordedAudio) {
    return { audio_base64: null };
  }

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const blob = dataUrlToBlob(recordedAudio);
  const ext = blob.type.includes("webm") ? "webm" : "m4a";
  const formData = new FormData();
  formData.append("audio", blob, `recording.${ext}`);

  try {
    const res = await axios.post<{ audioKey: string }>(
      `${API_BASE_URL}/api/surveys/upload-audio`,
      formData,
      { headers }
    );
    return { audioKey: res.data.audioKey };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 503) {
      return { audio_base64: recordedAudio };
    }
    throw error;
  }
}
