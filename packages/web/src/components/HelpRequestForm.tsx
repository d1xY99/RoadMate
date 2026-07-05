import { type FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type ProblemType =
  | 'flat_tire'
  | 'dead_battery'
  | 'out_of_fuel'
  | 'stuck'
  | 'mechanical'
  | 'other';

export const PROBLEM_LABELS: Record<ProblemType, string> = {
  flat_tire: 'Guma',
  dead_battery: 'Akumulator',
  out_of_fuel: 'Gorivo',
  stuck: 'Zaglavljen',
  mechanical: 'Kvar',
  other: 'Ostalo',
};

const PROBLEMS = Object.entries(PROBLEM_LABELS) as [ProblemType, string][];

// Bottom-sheet form for creating a help request (#9). Location comes from the
// map (approximate user position); the RPC stamps requester_id server-side.
export function HelpRequestForm({
  center,
  onClose,
  onCreated,
}: {
  center: [number, number] | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<ProblemType | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!type || !center) return;
    setError(null);
    setSending(true);
    const [lng, lat] = center;
    const { error: err } = await supabase.rpc('create_help_request', {
      p_type: type,
      p_description: description.trim() || null,
      lat,
      lng,
    });
    setSending(false);
    if (err) {
      setError('Slanje nije uspjelo. Pokušaj ponovo.');
      return;
    }
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Zatvori"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md animate-fade-up rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-xl">Trebam pomoć</h2>
            <p className="mt-0.5 text-slate-500 text-sm">
              Odaberi problem — pomagači u blizini dobijaju tvoju približnu
              lokaciju.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zatvori formu"
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-red-700 text-sm">
              {error}
            </div>
          )}
          {!center && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-amber-700 text-sm">
              Čekamo tvoju lokaciju — dozvoli pristup lokaciji da pošalješ
              zahtjev.
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {PROBLEMS.map(([value, label]) => {
              const active = type === value;
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => setType(value)}
                  aria-pressed={active}
                  className={`rounded-xl border px-2 py-3 font-medium text-sm transition ${
                    active
                      ? 'border-brand bg-brand/5 text-brand ring-2 ring-brand/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <label className="block">
            <span className="mb-1.5 block font-medium text-slate-700 text-sm">
              Opis (opciono)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Npr. probušena guma na autoputu, desna traka…"
              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>

          <button
            type="submit"
            disabled={!type || !center || sending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            Pošalji zahtjev
          </button>
        </form>
      </div>
    </div>
  );
}
