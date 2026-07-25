import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';

type Conversation = {
  partner_id: string;
  full_name: string | null;
  photo_url: string | null;
  last_body: string;
  last_at: string;
  last_is_own: boolean;
  unread_count: number;
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

// Lista DM razgovora sa zadnjom porukom i brojem nepročitanih.
export function Messages() {
  const listQ = useQuery({
    queryKey: ['conversations'],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_conversations');
      if (error) throw error;
      return data as Conversation[];
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 flex items-center justify-between border-slate-200 border-b bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/friends"
            className="text-slate-500 text-sm transition hover:text-slate-800 dark:hover:text-slate-200"
          >
            Prijatelji
          </Link>
          <Link
            to="/"
            className="text-slate-500 text-sm transition hover:text-slate-800 dark:hover:text-slate-200"
          >
            ← Karta
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4 sm:p-6">
        <h1 className="font-bold text-2xl text-slate-900 dark:text-slate-100">
          Poruke
        </h1>

        <div className="mt-4 flex flex-col gap-2">
          {listQ.isLoading && (
            <p className="py-10 text-center text-slate-400 text-sm">
              Učitavanje…
            </p>
          )}
          {listQ.isSuccess && listQ.data.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                Još nemaš razgovora.
              </p>
              <Link
                to="/friends"
                className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-sm text-white transition hover:bg-brand-dark"
              >
                Pronađi prijatelje
              </Link>
            </div>
          )}
          {(listQ.data ?? []).map((c) => (
            <Link
              key={c.partner_id}
              to="/messages/$userId"
              params={{ userId: c.partner_id }}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
            >
              {c.photo_url ? (
                <img
                  src={c.photo_url}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white">
                  {(c.full_name?.[0] ?? '?').toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                    {c.full_name || 'Korisnik'}
                  </span>
                  <span className="shrink-0 text-slate-400 text-xs">
                    {fmtDate(c.last_at)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span
                    className={`truncate text-sm ${
                      c.unread_count > 0
                        ? 'font-semibold text-slate-900 dark:text-slate-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {c.last_is_own ? 'Ti: ' : ''}
                    {c.last_body}
                  </span>
                  {c.unread_count > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 font-bold text-white text-xs">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
