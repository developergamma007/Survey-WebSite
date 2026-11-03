export const GOOGLE_MAPS_USER_ERROR =
  "Google Maps could not load. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (or GOOGLE_MAPS_API_KEY on the server), enable Maps JavaScript API + billing, and allow this origin in key restrictions (e.g. https://peoplepulse.iswot.in/*).";

declare global {
  interface Window {
    google?: any;
    __surveyGoogleMapsBoot?: () => void;
    gm_authFailure?: () => void;
  }
}

let resolvedKeyCache: string | null | undefined;
let scriptPromise: Promise<any> | null = null;
let loadedKey = "";

function removeGoogleMapsScripts() {
  if (typeof document === "undefined") return;
  document.querySelectorAll('script[data-google-maps="survey"]').forEach((el) => el.remove());
  if (window.google) {
    try {
      delete window.google;
    } catch {
      window.google = undefined;
    }
  }
  delete window.gm_authFailure;
  delete window.__surveyGoogleMapsBoot;
}

async function resolveGoogleMapsApiKey(): Promise<string> {
  if (resolvedKeyCache !== undefined) {
    if (!resolvedKeyCache) {
      throw new Error("Google Maps is not configured for this environment.");
    }
    return resolvedKeyCache;
  }

  const baked = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (baked) {
    resolvedKeyCache = baked;
    return baked;
  }

  try {
    const res = await fetch("/client-config", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { googleMapsApiKey?: string };
      const runtime = data.googleMapsApiKey?.trim();
      if (runtime) {
        resolvedKeyCache = runtime;
        return runtime;
      }
    }
  } catch {
    // fall through
  }

  resolvedKeyCache = null;
  throw new Error("Google Maps is not configured for this environment.");
}

function loadScriptWithKey(key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      delete window.__surveyGoogleMapsBoot;
      reject(error);
    };
    const ok = () => {
      if (settled) return;
      if (!window.google?.maps?.Map) {
        fail(new Error(GOOGLE_MAPS_USER_ERROR));
        return;
      }
      settled = true;
      loadedKey = key;
      resolve(window.google);
    };

    window.gm_authFailure = () => fail(new Error(GOOGLE_MAPS_USER_ERROR));
    window.__surveyGoogleMapsBoot = ok;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&callback=__surveyGoogleMapsBoot`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "survey";
    script.onerror = () => fail(new Error("Failed to download Google Maps script."));
    document.body.appendChild(script);
  });
}

/** Load Maps JavaScript API once per page (aligned with Votabase-Website). */
export async function loadGoogleMapsScript(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Maps are not available during server rendering."));
  }

  const key = await resolveGoogleMapsApiKey();
  if (window.google?.maps?.Map && loadedKey === key) {
    return window.google;
  }

  if (!scriptPromise) {
    scriptPromise = (async () => {
      removeGoogleMapsScripts();
      try {
        return await loadScriptWithKey(key);
      } catch (error) {
        scriptPromise = null;
        loadedKey = "";
        throw error;
      }
    })();
  }

  return scriptPromise;
}
