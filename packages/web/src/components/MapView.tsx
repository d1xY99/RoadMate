import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';

type Props = {
  center?: [number, number];
  zoom?: number;
};

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
