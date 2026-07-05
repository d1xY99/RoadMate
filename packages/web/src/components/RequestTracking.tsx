import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { MapView, type NearbyHelper } from '@/components/MapView';
import { supabase } from '@/lib/supabase';

type Tracking = {
  status: string;
  requester_lat: number;
  requester_lng: number;
  helper_lat: number | null;
  helper_lng: number | null;
  distance_m: number | null;
};

// Assumed average travel speed for the ETA (city + road mix).
const SPEED_MS = 40_000 / 3600; // 40 km/h
const SEND_MS = 15_000;

const fmtEta = (m: number) => {
  const min = Math.max(1, Math.round(m / SPEED_MS / 60));
  return `~${min} min`;
};
const fmtKm = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

// Live map after a match (#28): shows the requester (blue) and helper (green)
// positions, an ETA, and streams the viewer's own location.
export function RequestTracking({
  requestId,
  role,
  helperName,
  helperVehicle,
}: {
  requestId: string;
  role: 'requester' | 'helper';
  helperName: string;
  helperVehicle: string | null;
}) {
  const trackQ = useQuery({
    queryKey: ['tracking', requestId],
    refetchInterval: 12_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_request_tracking', {
        p_request_id: requestId,
      });
      if (error) throw error;
      return ((data as Tracking[])[0] ?? null) as Tracking | null;
    },
  });
  const t = trackQ.data;

  // Stream the viewer's own location so the other side sees movement.
  useEffect(() => {
    if (!navigator.geolocation) return;
    const send = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          if (role === 'helper') {
            await supabase.rpc('update_my_location', {
              lat,
              lng,
              available: true,
            });
          } else {
            await supabase
              .from('help_requests')
              .update({ location: `SRID=4326;POINT(${lng} ${lat})` })
              .eq('id', requestId);
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    };
    send();
    const id = setInterval(send, SEND_MS);
    return () => clearInterval(id);
  }, [requestId, role]);

  if (!t) return null;

  const center: [number, number] = [t.requester_lng, t.requester_lat];
  const helperPin: NearbyHelper[] =
    t.helper_lat != null && t.helper_lng != null
      ? [
          {
            id: 'helper',
            full_name: helperName,
            vehicle_type: helperVehicle,
            thumbs_up: 0,
            thumbs_down: 0,
            distance_m: t.distance_m ?? 0,
            approx_lat: t.helper_lat,
            approx_lng: t.helper_lng,
          },
        ]
      : [];

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="relative h-56">
        <MapView center={center} zoom={14} showUserMarker helpers={helperPin} />
        {t.distance_m != null && (
          <div className="-translate-x-1/2 absolute top-3 left-1/2 z-10 rounded-full border border-white/60 bg-white/85 px-4 py-1.5 font-semibold text-slate-700 text-xs shadow backdrop-blur">
            Pomagač stiže za {fmtEta(t.distance_m)} · {fmtKm(t.distance_m)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 px-4 py-2.5 text-slate-500 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Ti
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Pomagač
        </span>
      </div>
    </div>
  );
}
