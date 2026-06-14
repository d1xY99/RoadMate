import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';

type Props = {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
};

// Vanilla MapLibre wrapped in a React component (no react-map-gl dependency,
// avoids React 19 peer issues). Free demo tiles for now — swap the style URL
// for a real provider (MapTiler / Mapbox) later.
export function MapView({ center = [15.98, 45.81], zoom = 12 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center,
      zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom]);

  return <div ref={containerRef} className="h-full w-full" />;
}
