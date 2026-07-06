import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { useTheme } from '@/lib/theme';

export type NearbyHelper = {
  id: string;
  full_name: string;
  vehicle_type: string | null;
  thumbs_up: number;
  thumbs_down: number;
  distance_m: number;
  approx_lat: number;
  approx_lng: number;
};

type Props = {
  center?: [number, number];
  zoom?: number;
  showUserMarker?: boolean;
  helpers?: NearbyHelper[];
};

const VEHICLE_LABELS: Record<string, string> = {
  car: 'Auto',
  van: 'Kombi',
  truck: 'Kamion',
  motorcycle: 'Motor',
  suv_4x4: 'Terenac',
};

// Generic car glyph for helper pins (vehicle type is spelled out in the popup).
const CAR_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] as string,
  );

const fmtDistance = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

const DEFAULT_CENTER: [number, number] = [15.98, 45.81];

// Free Carto basemaps (no API key) — swap for MapTiler/Mapbox before launch.
const LIGHT_STYLE =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const DARK_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export function MapView({
  center = DEFAULT_CENTER,
  zoom = 12,
  showUserMarker = false,
  helpers = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const helperMarkersRef = useRef<maplibregl.Marker[]>([]);
  const dark = useTheme((s) => s.dark);
  const styledDark = useRef(dark);

  // Create the map once; later center/zoom changes animate via flyTo below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: dark ? DARK_STYLE : LIGHT_STYLE,
      center,
      zoom,
      // Clean, app-like map: no zoom/compass controls, no attribution bar.
      // NOTE: re-add OSM/CARTO attribution (e.g. on an about page) pre-launch.
      attributionControl: false,
    });
    mapRef.current = map;
    return () => {
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Follow center changes (e.g. geolocation resolving) + keep the user marker
  // in sync. The marker element is styled/animated in index.css (.user-marker).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center, zoom, duration: 1600, essential: true });
    if (!showUserMarker) return;
    if (markerRef.current) {
      markerRef.current.setLngLat(center);
    } else {
      const el = document.createElement('div');
      el.className = 'user-marker';
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(center)
        .addTo(map);
    }
  }, [center, zoom, showUserMarker]);

  // Sync helper pins (few markers — clear and re-add is fine).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const m of helperMarkersRef.current) {
      m.remove();
    }
    helperMarkersRef.current = helpers.map((h) => {
      const el = document.createElement('div');
      el.className = 'helper-marker';
      el.innerHTML = CAR_SVG;
      const vehicle = h.vehicle_type
        ? (VEHICLE_LABELS[h.vehicle_type] ?? h.vehicle_type)
        : 'Vozilo nepoznato';
      const popup = new maplibregl.Popup({
        offset: 18,
        closeButton: false,
      }).setHTML(
        `<div class="helper-popup">
            <strong>${esc(h.full_name || 'Pomagač')}</strong>
            <span>${esc(vehicle)} · ${fmtDistance(h.distance_m)}</span>
            <span>👍 ${h.thumbs_up} · 👎 ${h.thumbs_down}</span>
          </div>`,
      );
      return new maplibregl.Marker({ element: el })
        .setLngLat([h.approx_lng, h.approx_lat])
        .setPopup(popup)
        .addTo(map);
    });
  }, [helpers]);

  // Swap the basemap when the theme flips. Markers are DOM overlays and
  // survive setStyle, so they stay put.
  useEffect(() => {
    if (styledDark.current === dark) return;
    styledDark.current = dark;
    mapRef.current?.setStyle(dark ? DARK_STYLE : LIGHT_STYLE);
  }, [dark]);

  return <div ref={containerRef} className="h-full w-full" />;
}
