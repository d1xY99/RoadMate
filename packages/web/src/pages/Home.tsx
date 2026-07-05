import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { HelperToggle } from '@/components/HelperToggle';
import {
  HelpRequestForm,
  PROBLEM_LABELS,
  type ProblemType,
} from '@/components/HelpRequestForm';
import { Logo } from '@/components/Logo';
import { MapView, type NearbyHelper } from '@/components/MapView';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type ActiveRequest = {
  id: string;
  type: ProblemType;
  status: 'open' | 'accepted';
};

const DEFAULT_CENTER: [number, number] = [15.98, 45.81];

// Public landing for logged-out visitors.
function Landing() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 text-center text-white">
      <div
        aria-hidden
        className="-right-32 -top-32 absolute h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="-bottom-32 -left-24 absolute h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative z-10 flex flex-col items-center">
        <span className="animate-fade-down">
          <Logo size="lg" light />
        </span>

        <div className="mt-10 animate-fade-up text-6xl">🚧</div>
        <h1
          className="mt-6 animate-fade-up font-bold text-4xl sm:text-5xl"
          style={{ animationDelay: '0.1s' }}
        >
          U izradi
        </h1>
        <p
          className="mt-4 max-w-md animate-fade-up text-lg text-white/80"
          style={{ animationDelay: '0.2s' }}
        >
          Radimo na aplikaciji za pomoć na cesti. Uskoro stiže — zajednica koja
          se odaziva.
        </p>

        <div
          className="mt-10 flex animate-fade-up flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: '0.3s' }}
        >
          <Link
            to="/login"
            className="rounded-lg bg-white px-6 py-3 font-semibold text-brand text-sm transition hover:bg-white/90"
          >
            Prijava
          </Link>
          <Link
            to="/register"
            className="rounded-lg border border-white/40 px-6 py-3 font-semibold text-sm text-white transition hover:bg-white/10"
          >
            Registracija
          </Link>
        </div>
      </div>

      <div className="absolute bottom-6 text-sm text-white/50">
        © {new Date().getFullYear()} RoadMate
      </div>
    </div>
  );
}

// Main map screen for signed-in users (#8).
function MapHome() {
  const session = useAuth((s) => s.session);
  const isAdmin = useAuth((s) => s.roles.includes('admin'));
  const signOut = useAuth((s) => s.signOut);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.longitude, pos.coords.latitude]),
      () => setGeoError(true),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  // Latest open/accepted request by this user (#9: active request state).
  const activeQ = useQuery({
    queryKey: ['active-request', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_requests')
        .select('id, type, status')
        .eq('requester_id', session?.user.id as string)
        .in('status', ['open', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as ActiveRequest | null) ?? null;
    },
  });
  const activeRequest = activeQ.data ?? null;

  // Nearby available helpers (#10); auto-refresh while the map is open.
  const helpersQ = useQuery({
    queryKey: ['nearby-helpers', center],
    enabled: !!center,
    refetchInterval: 30_000,
    queryFn: async () => {
      const [lng, lat] = center as [number, number];
      const { data, error } = await supabase.rpc('find_nearby_helpers', {
        lat,
        lng,
        radius_m: 15_000,
      });
      if (error) throw error;
      return data as NearbyHelper[];
    },
  });
  const helpers = helpersQ.data ?? [];

  const email = session?.user.email ?? '';
  const initial = (email[0] ?? '?').toUpperCase();

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-100">
      <MapView
        center={center ?? DEFAULT_CENTER}
        zoom={center ? 15 : 12}
        showUserMarker={!!center}
        helpers={helpers}
      />

      {/* Gornja traka */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-3xl animate-fade-down items-center justify-between gap-3 rounded-2xl border border-white/40 bg-white/40 px-4 py-2.5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40">
          <Logo />
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin-dashboard"
                className="hidden rounded-lg px-3 py-1.5 font-medium text-slate-600 text-sm transition hover:bg-slate-100 sm:block"
              >
                Admin
              </Link>
            )}
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pr-3 pl-1 shadow-sm transition hover:bg-slate-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white text-xs">
                {initial}
              </span>
              <span className="max-w-32 truncate font-medium text-slate-700 text-sm">
                Profil
              </span>
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-lg px-3 py-1.5 font-medium text-red-600 text-sm transition hover:bg-red-50"
            >
              Odjava
            </button>
          </div>
        </div>

        {geoError && (
          <div className="pointer-events-auto mx-auto mt-2 w-fit animate-fade-down rounded-full bg-slate-900/80 px-4 py-1.5 text-white text-xs backdrop-blur">
            Lokacija nije dostupna — prikazujemo zadanu kartu.
          </div>
        )}
        {center && helpersQ.isSuccess && (
          <div className="pointer-events-auto mx-auto mt-2 flex w-fit animate-fade-down items-center gap-2 rounded-full border border-white/40 bg-white/45 px-4 py-1.5 font-medium text-slate-700 text-xs shadow backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-200">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                helpers.length ? 'bg-green-500' : 'bg-slate-300'
              }`}
            />
            {helpers.length
              ? `${helpers.length} ${helpers.length === 1 ? 'pomagač' : 'pomagača'} u blizini`
              : 'Nema dostupnih pomagača u blizini'}
          </div>
        )}
      </header>

      {/* Donje akcije */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 pb-6">
        <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-3">
          <div className="animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <HelperToggle />
          </div>
          {activeRequest ? (
            <div className="animate-fade-up rounded-2xl border border-white/40 bg-white/70 p-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Aktivan zahtjev — {PROBLEM_LABELS[activeRequest.type]}
                    </div>
                    <div className="text-slate-500 text-xs dark:text-slate-400">
                      {activeRequest.status === 'open'
                        ? 'Čeka pomagača…'
                        : 'Pomagač je prihvatio.'}
                    </div>
                  </div>
                </div>
                <Link
                  to="/request/$id"
                  params={{ id: activeRequest.id }}
                  className="rounded-lg px-3 py-1.5 font-medium text-brand text-sm transition hover:bg-brand/5"
                >
                  Detalji →
                </Link>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="animate-sos flex h-14 w-full animate-fade-up items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 font-bold text-lg text-white shadow-xl transition hover:brightness-110 active:scale-[0.98]"
              style={{ animationDelay: '0.25s' }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              Trebam pomoć
            </button>
          )}
        </div>
      </div>

      {formOpen && (
        <HelpRequestForm
          center={center}
          onClose={() => setFormOpen(false)}
          onCreated={() => {
            setFormOpen(false);
            activeQ.refetch();
          }}
        />
      )}
    </div>
  );
}

export function Home() {
  const session = useAuth((s) => s.session);
  const loading = useAuth((s) => s.loading);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        Učitavanje...
      </div>
    );
  }
  return session ? <MapHome /> : <Landing />;
}
