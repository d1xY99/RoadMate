import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { PROBLEM_LABELS, type ProblemType } from '@/components/HelpRequestForm';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';

type WallRow = {
  request_id: string;
  type: ProblemType;
  resolved_at: string;
  helper_id: string;
  helper_name: string;
  helper_photo: string | null;
  helper_vehicle: string | null;
  comment: string | null;
};

type Stats = {
  total_helps: number;
  helps_7d: number;
  helpers: number;
};

const VEHICLE_LABELS: Record<string, string> = {
  car: 'Auto',
  van: 'Kombi',
  truck: 'Kamion',
  motorcycle: 'Motor',
  suv_4x4: 'Terenac',
};

const fmtRelative = (s: string) => {
  const diff = (Date.now() - new Date(s).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('hr', { numeric: 'auto' });
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (diff < 86_400) return rtf.format(-Math.round(diff / 3600), 'hour');
  return rtf.format(-Math.round(diff / 86_400), 'day');
};

// Heroji ceste: javni feed riješenih pomoći — social proof da zajednica
// radi. Prikazuje pomagača i pohvalu; tražitelj ostaje anoniman.
export function Heroes() {
  const wallQ = useQuery({
    queryKey: ['gratitude-wall'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_gratitude_wall', {
        p_limit: 50,
      });
      if (error) throw error;
      return data as WallRow[];
    },
  });

  const statsQ = useQuery({
    queryKey: ['gratitude-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('gratitude_stats');
      if (error) throw error;
      return (data as Stats[])[0] ?? null;
    },
  });
  const stats = statsQ.data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 flex items-center justify-between border-slate-200 border-b bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <Link to="/">
          <Logo />
        </Link>
        <Link
          to="/"
          className="text-slate-500 text-sm transition hover:text-slate-800 dark:hover:text-slate-200"
        >
          ← Karta
        </Link>
      </header>

      <main className="mx-auto max-w-lg p-4 sm:p-6">
        <h1 className="font-bold text-2xl text-slate-900 dark:text-slate-100">
          Heroji ceste ⚡
        </h1>
        <p className="mt-1 text-slate-500 text-sm dark:text-slate-400">
          Ljudi koji su stali kad je trebalo.
        </p>

        {stats && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatTile value={stats.total_helps} label="Ukupno pomoći" />
            <StatTile value={stats.helps_7d} label="Zadnjih 7 dana" />
            <StatTile value={stats.helpers} label="Heroja" />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {wallQ.isLoading && (
            <p className="py-10 text-center text-slate-400 text-sm">
              Učitavanje…
            </p>
          )}
          {wallQ.isSuccess && wallQ.data.length === 0 && (
            <p className="py-10 text-center text-slate-400 text-sm">
              Još nema riješenih pomoći — budi prvi heroj. ⚡
            </p>
          )}
          {(wallQ.data ?? []).map((r) => (
            <article
              key={r.request_id}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                {r.helper_photo ? (
                  <img
                    src={r.helper_photo}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white">
                    {(r.helper_name[0] ?? '?').toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-slate-900 dark:text-slate-100">
                    <span className="font-semibold">{r.helper_name}</span>{' '}
                    <span className="text-slate-600 dark:text-slate-300">
                      pomogao je kod problema
                    </span>{' '}
                    <span className="font-semibold">
                      {PROBLEM_LABELS[r.type] ?? r.type}
                    </span>
                  </div>
                  <div className="mt-0.5 text-slate-500 text-xs dark:text-slate-400">
                    {r.helper_vehicle
                      ? `${VEHICLE_LABELS[r.helper_vehicle] ?? r.helper_vehicle} · `
                      : ''}
                    {fmtRelative(r.resolved_at)}
                  </div>
                </div>
                <span className="shrink-0 text-xl">⚡</span>
              </div>

              {r.comment && (
                <blockquote className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3.5 py-2.5 text-slate-700 text-sm italic dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-slate-300">
                  „{r.comment}" <span className="not-italic">👍</span>
                </blockquote>
              )}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="font-bold text-slate-900 text-xl dark:text-slate-100">
        {value}
      </div>
      <div className="mt-0.5 text-slate-500 text-xs dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}
