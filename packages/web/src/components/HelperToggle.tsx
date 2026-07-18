import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// ponytail: fixed 60s re-ping while available. Tie to HELPER_STALE_MINUTES /
// movement if battery or freshness ever matters.
const PING_MS = 60_000;

// Grab the browser location once, as a promise.
const getPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolokacija nije podržana.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
    });
  });

async function pushLocation(available: boolean) {
  const pos = await getPosition();
  const { error } = await supabase.rpc('update_my_location', {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    available,
  });
  if (error) throw new Error(error.message);
}

// Helper mode toggle (#11): mark yourself available and stream location, or go
// offline. Reads current availability once, then owns it.
export function HelperToggle({
  onAvailabilityChange,
}: {
  onAvailabilityChange?: (available: boolean) => void;
} = {}) {
  const uid = useAuth((s) => s.session?.user.id);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  const stopPinging = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = undefined;
  };

  const startPinging = () => {
    stopPinging();
    timer.current = setInterval(() => {
      // Best-effort refresh; ignore transient errors while available.
      pushLocation(true).catch(() => {});
    }, PING_MS);
  };

  // Load current availability; resume pinging if already available.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once per uid; ping fns are stable
  useEffect(() => {
    if (!uid) return;
    let active = true;
    supabase
      .from('profiles')
      .select('is_available')
      .eq('id', uid)
      .single()
      .then(({ data }) => {
        if (!active || !data) return;
        setAvailable(data.is_available);
        onAvailabilityChange?.(data.is_available);
        if (data.is_available) startPinging();
      });
    return () => {
      active = false;
      stopPinging();
    };
  }, [uid]);

  const toggle = async () => {
    setError(null);
    setBusy(true);
    const next = !available;
    try {
      await pushLocation(next);
      setAvailable(next);
      onAvailabilityChange?.(next);
      if (next) startPinging();
      else stopPinging();
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes('podržana')
          ? e.message
          : 'Ne mogu dohvatiti lokaciju. Dozvoli pristup lokaciji.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/30 bg-white/30 p-5 shadow-lg backdrop-blur-md backdrop-saturate-150 dark:border-white/10 dark:bg-slate-800/30">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              available ? 'bg-green-500' : 'bg-slate-300'
            }`}
          />
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {available ? 'Dostupan za pomoć' : 'Nedostupan'}
            </div>
            <div className="text-slate-500 text-xs dark:text-slate-400">
              {available
                ? 'Vidljiv si pomagačima u blizini.'
                : 'Uključi da primaš zahtjeve u blizini.'}
            </div>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={available}
          aria-label="Dostupan za pomoć"
          disabled={busy}
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
            available ? 'bg-green-500' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              available ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
