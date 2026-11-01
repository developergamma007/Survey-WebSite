export const GOOGLE_MAPS_USER_ERROR =
  "Google Maps could not load. Check the Maps JavaScript API key, billing and allowed origins.";

declare global {
  interface Window {
    google?: any;
    __surveyGoogleMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

let loader: Promise<any> | null = null;

/** Loads Google Maps once for all analysis views in the browser. */
export function loadGoogleMapsScript(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Maps are not available during server rendering."));
  }
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  if (loader) return loader;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    return Promise.reject(new Error("Google Maps is not configured for this environment."));
  }

  loader = new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      loader = null;
      reject(error);
    };
    const ready = () => {
      if (settled) return;
      if (!window.google?.maps?.Map) {
        fail(new Error(GOOGLE_MAPS_USER_ERROR));
        return;
      }
      settled = true;
      resolve(window.google);
    };

    window.__surveyGoogleMapsReady = ready;
    window.gm_authFailure = () => fail(new Error(GOOGLE_MAPS_USER_ERROR));

    const script = document.createElement("script");
    script.id = "survey-google-maps";
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "survey";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&callback=__surveyGoogleMapsReady`;
    script.onerror = () => fail(new Error("Failed to download Google Maps."));
    document.head.appendChild(script);
  });

  return loader;
}
