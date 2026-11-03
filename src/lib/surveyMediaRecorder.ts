/** Voice-optimized bitrate: ~11 MB for 30 minutes at 48 kbps. */
export const SURVEY_AUDIO_BITS_PER_SECOND = 48_000;

export function pickSurveyRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return undefined;
}

export function createSurveyMediaRecorder(stream: MediaStream): MediaRecorder {
  const mimeType = pickSurveyRecorderMimeType();
  const options: MediaRecorderOptions = {
    audioBitsPerSecond: SURVEY_AUDIO_BITS_PER_SECOND,
  };
  if (mimeType) options.mimeType = mimeType;
  return new MediaRecorder(stream, options);
}

export function surveyRecorderBlobType(recorder: MediaRecorder | null): string {
  const mime = recorder?.mimeType?.trim();
  if (mime) return mime;
  return pickSurveyRecorderMimeType() ?? "audio/webm";
}
