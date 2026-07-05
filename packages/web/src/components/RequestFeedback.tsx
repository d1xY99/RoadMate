import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function ThumbIcon({ down = false }: { down?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={down ? 'rotate-180' : undefined}
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

// Post-resolution rating (#31): one feedback per rater per request. Thumbs
// up/down + optional comment; the DB trigger bumps the ratee's aggregate.
export function RequestFeedback({
  requestId,
  toUser,
}: {
  requestId: string;
  toUser: string;
}) {
  const uid = useAuth((s) => s.session?.user.id);
  const [positive, setPositive] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const existingQ = useQuery({
    queryKey: ['feedback', requestId, uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('feedback')
        .select('id, positive')
        .eq('request_id', requestId)
        .eq('from_user', uid as string)
        .maybeSingle();
      if (err) throw err;
      return (data as { id: string; positive: boolean } | null) ?? null;
    },
  });

  const submit = async () => {
    if (positive === null || !uid) return;
    setError(null);
    setSaving(true);
    const { error: err } = await supabase.from('feedback').insert({
      request_id: requestId,
      from_user: uid,
      to_user: toUser,
      positive,
      comment: comment.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError('Slanje ocjene nije uspjelo.');
      return;
    }
    existingQ.refetch();
  };

  if (existingQ.isLoading) return null;

  const existing = existingQ.data;
  if (existing) {
    return (
      <div className="mt-4 rounded-2xl border border-green-100 bg-green-50/60 p-5 text-center shadow-sm">
        <div className="font-semibold text-slate-900">
          Hvala na ocjeni! {existing.positive ? '👍' : '👎'}
        </div>
        <div className="mt-0.5 text-slate-500 text-sm">
          Tvoja ocjena je zabilježena.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900">Ocijeni</h2>
      <p className="mt-0.5 text-slate-500 text-sm">
        Kako je prošla pomoć? Tvoja ocjena pomaže zajednici.
      </p>

      <div className="mt-4 flex justify-center gap-4">
        <button
          type="button"
          onClick={() => setPositive(true)}
          aria-pressed={positive === true}
          aria-label="Palac gore"
          className={`flex h-16 w-24 flex-col items-center justify-center gap-1 rounded-2xl border transition ${
            positive === true
              ? 'border-green-500 bg-green-50 text-green-600 ring-2 ring-green-200'
              : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <ThumbIcon />
          <span className="font-medium text-xs">Pozitivno</span>
        </button>
        <button
          type="button"
          onClick={() => setPositive(false)}
          aria-pressed={positive === false}
          aria-label="Palac dole"
          className={`flex h-16 w-24 flex-col items-center justify-center gap-1 rounded-2xl border transition ${
            positive === false
              ? 'border-red-400 bg-red-50 text-red-500 ring-2 ring-red-200'
              : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <ThumbIcon down />
          <span className="font-medium text-xs">Negativno</span>
        </button>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Komentar (opciono)…"
        className="mt-4 w-full resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/30"
      />

      {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}

      <button
        type="button"
        onClick={submit}
        disabled={positive === null || saving}
        className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-brand font-semibold text-sm text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        Pošalji ocjenu
      </button>
    </div>
  );
}
