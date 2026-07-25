import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';

type SearchRow = {
  id: string;
  full_name: string;
  photo_url: string | null;
  vehicle_type: string | null;
  thumbs_up: number;
  thumbs_down: number;
  friendship_id: string | null;
  friendship_status: 'pending' | 'accepted' | 'declined' | null;
  is_requester: boolean | null;
};

type RequestRow = {
  friendship_id: string;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  incoming: boolean;
  created_at: string;
};

type FriendRow = {
  friend_id: string;
  full_name: string;
  photo_url: string | null;
  vehicle_type: string | null;
  thumbs_up: number;
  thumbs_down: number;
  friends_since: string;
};

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  return photo ? (
    <img
      src={photo}
      alt=""
      className="h-10 w-10 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-sm text-white">
      {(name[0] ?? '?').toUpperCase()}
    </span>
  );
}

// Društvena strana (#friends): pretraga ljudi, zahtjevi za prijateljstvo,
// lista prijatelja. Poruke su moguće samo između prijatelja.
export function Friends() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const searchQ = useQuery({
    queryKey: ['user-search', debounced],
    enabled: debounced.length >= 2,
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc('search_users', {
        p_query: debounced,
      });
      if (err) throw err;
      return data as SearchRow[];
    },
  });

  const requestsQ = useQuery({
    queryKey: ['friend-requests'],
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc('list_friend_requests');
      if (err) throw err;
      return data as RequestRow[];
    },
  });

  const friendsQ = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc('list_friends');
      if (err) throw err;
      return data as FriendRow[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['user-search'] });
    queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    queryClient.invalidateQueries({ queryKey: ['friends'] });
  };

  const run = async (id: string, fn: () => PromiseLike<{ error: unknown }>) => {
    setBusyId(id);
    setError(null);
    const { error: err } = await fn();
    setBusyId(null);
    if (err) {
      setError('Akcija nije uspjela. Pokušaj ponovo.');
      return;
    }
    refresh();
  };

  const sendRequest = (userId: string) =>
    run(userId, () =>
      supabase.rpc('send_friend_request', { p_user_id: userId }),
    );
  const respond = (friendshipId: string, accept: boolean) =>
    run(friendshipId, () =>
      supabase.rpc('respond_friend_request', {
        p_friendship_id: friendshipId,
        p_accept: accept,
      }),
    );
  const remove = (userId: string) =>
    run(userId, () => supabase.rpc('remove_friend', { p_user_id: userId }));

  const incoming = (requestsQ.data ?? []).filter((r) => r.incoming);
  const outgoing = (requestsQ.data ?? []).filter((r) => !r.incoming);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 flex items-center justify-between border-slate-200 border-b bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/messages"
            className="text-slate-500 text-sm transition hover:text-slate-800 dark:hover:text-slate-200"
          >
            Poruke
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
          Prijatelji
        </h1>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        {/* Pretraga */}
        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pretraži ljude po imenu…"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          {debounced.length >= 2 && (
            <div className="mt-3 flex flex-col gap-2">
              {searchQ.isLoading && (
                <p className="py-4 text-center text-slate-400 text-sm">
                  Tražim…
                </p>
              )}
              {searchQ.isSuccess && searchQ.data.length === 0 && (
                <p className="py-4 text-center text-slate-400 text-sm">
                  Nema korisnika za "{debounced}".
                </p>
              )}
              {(searchQ.data ?? []).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={u.full_name} photo={u.photo_url} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {u.full_name || 'Bez imena'}
                      </div>
                      <div className="text-slate-500 text-xs dark:text-slate-400">
                        👍 {u.thumbs_up} · 👎 {u.thumbs_down}
                      </div>
                    </div>
                  </div>
                  {u.friendship_status === 'accepted' ? (
                    <Link
                      to="/messages/$userId"
                      params={{ userId: u.id }}
                      className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-sm text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      Poruka
                    </Link>
                  ) : u.friendship_status === 'pending' && u.is_requester ? (
                    <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-500 text-sm dark:bg-slate-800 dark:text-slate-400">
                      Na čekanju
                    </span>
                  ) : u.friendship_status === 'pending' && u.friendship_id ? (
                    <button
                      type="button"
                      disabled={busyId === u.friendship_id}
                      onClick={() => respond(u.friendship_id as string, true)}
                      className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-sm text-white transition hover:bg-green-700 disabled:opacity-60"
                    >
                      Prihvati
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => sendRequest(u.id)}
                      className="shrink-0 rounded-lg bg-brand px-3 py-1.5 font-semibold text-sm text-white transition hover:bg-brand-dark disabled:opacity-60"
                    >
                      Dodaj
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zahtjevi */}
        {(incoming.length > 0 || outgoing.length > 0) && (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
              Zahtjevi za prijateljstvo
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {incoming.map((r) => (
                <div
                  key={r.friendship_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={r.full_name} photo={r.photo_url} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {r.full_name || 'Bez imena'}
                      </div>
                      <div className="text-slate-500 text-xs dark:text-slate-400">
                        Želi biti prijatelj
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busyId === r.friendship_id}
                      onClick={() => respond(r.friendship_id, true)}
                      className="rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-sm text-white transition hover:bg-green-700 disabled:opacity-60"
                    >
                      Prihvati
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.friendship_id}
                      onClick={() => respond(r.friendship_id, false)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 text-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Odbij
                    </button>
                  </div>
                </div>
              ))}
              {outgoing.map((r) => (
                <div
                  key={r.friendship_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={r.full_name} photo={r.photo_url} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {r.full_name || 'Bez imena'}
                      </div>
                      <div className="text-slate-500 text-xs dark:text-slate-400">
                        Zahtjev poslan — čeka odgovor
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === r.user_id}
                    onClick={() => remove(r.user_id)}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 text-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Otkaži
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Moji prijatelji */}
        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
            Moji prijatelji
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {friendsQ.isLoading && (
              <p className="py-6 text-center text-slate-400 text-sm">
                Učitavanje…
              </p>
            )}
            {friendsQ.isSuccess && friendsQ.data.length === 0 && (
              <p className="py-6 text-center text-slate-400 text-sm">
                Još nemaš prijatelja — pronađi ih pretragom iznad.
              </p>
            )}
            {(friendsQ.data ?? []).map((f) => (
              <div
                key={f.friend_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={f.full_name} photo={f.photo_url} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                      {f.full_name || 'Bez imena'}
                    </div>
                    <div className="text-slate-500 text-xs dark:text-slate-400">
                      👍 {f.thumbs_up} · 👎 {f.thumbs_down}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    to="/messages/$userId"
                    params={{ userId: f.friend_id }}
                    className="rounded-lg bg-brand px-3 py-1.5 font-semibold text-sm text-white transition hover:bg-brand-dark"
                  >
                    Poruka
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === f.friend_id}
                    onClick={() => remove(f.friend_id)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 text-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-900/60 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                  >
                    Ukloni
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
