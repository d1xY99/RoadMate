import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { PROBLEM_LABELS, type ProblemType } from '@/components/HelpRequestForm';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Status = 'open' | 'accepted' | 'resolved' | 'cancelled';

type Row = {
  id: string;
  type: ProblemType;
  status: Status;
  created_at: string;
};

const STATUS_META: Record<Status, { label: string; badge: string }> = {
  open: { label: 'Otvoren', badge: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Prihvaćen', badge: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Riješen', badge: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Otkazan', badge: 'bg-slate-100 text-slate-600' },
};

const ACTIVE: Status[] = ['open', 'accepted'];

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const TABS = [
  { key: 'active', label: 'Aktivni' },
  { key: 'done', label: 'Završeni' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export function MyRequests() {
  const uid = useAuth((s) => s.session?.user.id);
  const [tab, setTab] = useState<Tab>('active');

  const listQ = useQuery({
    queryKey: ['my-requests', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_requests')
        .select('id, type, status, created_at')
        .eq('requester_id', uid as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const rows = (listQ.data ?? []).filter((r) =>
    tab === 'active' ? ACTIVE.includes(r.status) : !ACTIVE.includes(r.status),
  );

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
          Moji zahtjevi
        </h1>

        {/* Filter */}
        <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-1.5 font-medium text-sm transition ${
                tab === t.key
                  ? 'bg-brand text-white'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {listQ.isLoading && (
            <p className="py-10 text-center text-slate-400 text-sm">
              Učitavanje...
            </p>
          )}
          {!listQ.isLoading && rows.length === 0 && (
            <p className="py-10 text-center text-slate-400 text-sm">
              {tab === 'active'
                ? 'Nemaš aktivnih zahtjeva.'
                : 'Nemaš završenih zahtjeva.'}
            </p>
          )}
          {rows.map((r) => {
            const meta = STATUS_META[r.status];
            return (
              <Link
                key={r.id}
                to="/request/$id"
                params={{ id: r.id }}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {PROBLEM_LABELS[r.type]}
                  </div>
                  <div className="mt-0.5 text-slate-500 text-xs dark:text-slate-400">
                    {fmtDate(r.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold text-xs ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-slate-400">›</span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
