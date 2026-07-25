import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  disablePush,
  enablePush,
  getPushState,
  PushError,
  type PushState,
} from '@/lib/push';

// Uključivanje push notifikacija za ovaj uređaj. Lives on the profile page.
export function PushSettings() {
  const uid = useAuth((s) => s.session?.user.id);
  const [state, setState] = useState<PushState | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPushState().then(setState);
  }, []);

  const toggle = async () => {
    if (!uid || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (state === 'subscribed') {
        await disablePush();
      } else {
        await enablePush(uid);
      }
      setState(await getPushState());
    } catch (e) {
      setError(
        e instanceof PushError
          ? e.message
          : 'Nešto je pošlo po zlu. Pokušaj ponovo.',
      );
      setState(await getPushState());
    }
    setBusy(false);
  };

  const on = state === 'subscribed';

  return (
    <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
            Notifikacije
          </h2>
          <p className="mt-0.5 text-slate-500 text-sm dark:text-slate-400">
            {state === 'unsupported'
              ? 'Ovaj browser ne podržava push notifikacije.'
              : state === 'denied'
                ? 'Blokirane su u postavkama browsera.'
                : 'Zahtjevi u blizini, ponude i poruke — i kad je app zatvoren.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={
            busy ||
            state === 'loading' ||
            state === 'unsupported' ||
            state === 'denied'
          }
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
            on ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              on ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
