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
  const attempts: MediaRecorderOptions[] = [];
  if (mimeType) {
    attempts.push({ mimeType, audioBitsPerSecond: SURVEY_AUDIO_BITS_PER_SECOND });
    // Safari (macOS, iOS, Windows) often rejects bitrate + mime together.
    attempts.push({ mimeType });
  }
  attempts.push({ audioBitsPerSecond: SURVEY_AUDIO_BITS_PER_SECOND });
  attempts.push({});

  for (const options of attempts) {
    try {
      return new MediaRecorder(stream, options);
    } catch {
      // try next option set
    }
  }
  return new MediaRecorder(stream);
}

/** True when in-browser field recording can run (HTTPS or localhost). */
export function isBrowserSurveyRecordingSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof MediaRecorder === "undefined") return false;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  const secure =
    window.isSecureContext ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  return secure;
}

export function surveyRecorderBlobType(recorder: MediaRecorder | null): string {
  const mime = recorder?.mimeType?.trim();
  if (mime) return mime;
  return pickSurveyRecorderMimeType() ?? "audio/webm";
}
