import { loadGoogleMapsScript } from "@/lib/googleMaps";

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

function isValidCoord(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function createMap(container: HTMLElement, center: { lat: number; lng: number }, zoom: number) {
  return new (window as any).google.maps.Map(container, {
    center,
    zoom,
    mapTypeControl: true,
    fullscreenControl: true,
    streetViewControl: false,
  });
}

function createCircleMarker(
  map: any,
  point: { latitude: number; longitude: number; name?: string },
  options: { color: string; scale?: number; fillOpacity?: number }
) {
  return new window.google.maps.Marker({
    map,
    position: { lat: point.latitude, lng: point.longitude },
    title: point.name,
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: options.scale ?? 7,
      fillColor: options.color,
      fillOpacity: options.fillOpacity ?? 0.9,
      strokeColor: "#ffffff",
      strokeWeight: 2,
    },
  });
}

function fitMapToMarkers(map: any, markers: any[]) {
  if (!markers.length) return;
  if (markers.length === 1) {
    map.setCenter(markers[0].getPosition()!);
    map.setZoom(16);
    return;
  }
  const bounds = new window.google.maps.LatLngBounds();
  markers.forEach((marker) => bounds.extend(marker.getPosition()!));
  map.fitBounds(bounds, 48);
}

export type PointsMapPoint = {
  latitude: number;
  longitude: number;
  name?: string;
};

export async function buildPointsGoogleMap<T extends PointsMapPoint>(
  container: HTMLElement,
  points: T[],
  options: {
    getColor?: (point: T) => string;
    getPopupHtml?: (point: T) => string;
    defaultZoom?: number;
  } = {}
) {
  const {
    getColor = () => "#2563eb",
    getPopupHtml = () => "",
    defaultZoom = 13,
  } = options;

  await loadGoogleMapsScript();
  container.innerHTML = "";

  const validPoints = points.filter((p) => isValidCoord(Number(p.latitude), Number(p.longitude)));
  const center = validPoints.length
    ? { lat: validPoints[0].latitude, lng: validPoints[0].longitude }
    : DEFAULT_CENTER;

  const map = createMap(container, center, defaultZoom);
  const markers: any[] = [];
  const infoWindows: any[] = [];

  validPoints.forEach((point) => {
    const marker = createCircleMarker(map, point, {
      color: getColor(point),
      scale: 8,
      fillOpacity: 0.95,
    });
    const html = getPopupHtml(point);
    if (html) {
      const infoWindow = new window.google.maps.InfoWindow({ content: html, maxWidth: 340 });
      marker.addListener("click", () => {
        infoWindows.forEach((iw) => iw.close());
        infoWindow.open({ map, anchor: marker });
      });
      infoWindows.push(infoWindow);
    }
    markers.push(marker);
  });

  fitMapToMarkers(map, markers);
  window.requestAnimationFrame(() => {
    window.google.maps.event.trigger(map, "resize");
    fitMapToMarkers(map, markers);
  });

  return { map, markers, infoWindows };
}
