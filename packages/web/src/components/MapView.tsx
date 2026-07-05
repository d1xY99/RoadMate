import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';

type Props = {
  center?: [number, number];
  zoom?: number;
  showUserMarker?: boolean;
};

const DEFAULT_CENTER: [number, number] = [15.98, 45.81];

// Free Carto basemap (no API key) — swap for MapTiler/Mapbox before launch.
const MAP_STYLE =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export function MapView({
  center = DEFAULT_CENTER,
  zoom = 12,
  showUserMarker = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Create the map once; later center/zoom changes animate via flyTo below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
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

  return <div ref={containerRef} className="h-full w-full" />;
}
