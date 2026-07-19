import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const REPORT_REASONS = [
  { value: 'no_show', label: 'Nije se pojavio' },
  { value: 'unsafe_behavior', label: 'Nesigurno ponasanje' },
  { value: 'harassment', label: 'Uznemiravanje' },
  { value: 'scam', label: 'Prevara ili lazni zahtjev' },
  { value: 'other', label: 'Drugo' },
] as const;

type ReportReason = (typeof REPORT_REASONS)[number]['value'];

type ExistingReport = {
  id: string;
  status: string;
  reason: string;
};

type ExistingBlock = {
  id: string;
  reason: string | null;
};

function FlagIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22V15" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}

export function ReportBlockActions({
  requestId,
  otherUserId,
  otherUserName,
}: {
  requestId: string;
  otherUserId: string;
  otherUserName: string;
}) {
  const uid = useAuth((s) => s.session?.user.id);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('unsafe_behavior');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingReport, setSavingReport] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);

  const reportQ = useQuery({
    queryKey: ['report', requestId, uid, otherUserId],
    enabled: !!uid && !!otherUserId,
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('reports')
        .select('id, status, reason')
        .eq('reporter_id', uid as string)
        .eq('reported_id', otherUserId)
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (err) throw err;
      return (data as ExistingReport | null) ?? null;
    },
  });

  const blockQ = useQuery({
    queryKey: ['blocked-user', uid, otherUserId],
    enabled: !!uid && !!otherUserId,
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('blocked_users')
        .select('id, reason')
        .eq('blocker_id', uid as string)
        .eq('blocked_id', otherUserId)
        .maybeSingle();
      if (err) throw err;
      return (data as ExistingBlock | null) ?? null;
    },
  });

  const existingReport = reportQ.data;
  const existingBlock = blockQ.data;

  const submitReport = async () => {
    if (!uid) return;
    setError(null);
    setNotice(null);
    setSavingReport(true);
    const label = REPORT_REASONS.find((item) => item.value === reason)?.label;
    const reasonText = [label, details.trim()].filter(Boolean).join(': ');
    const { error: err } = await supabase.from('reports').insert({
      reporter_id: uid,
      reported_id: otherUserId,
      request_id: requestId,
      reason: reasonText,
    });
    setSavingReport(false);

    if (err) {
      setError('Prijava nije poslana. Pokusaj ponovo.');
      return;
    }

    setReportOpen(false);
    setDetails('');
    setNotice('Prijava je poslana support timu.');
    reportQ.refetch();
  };

  const blockUser = async () => {
    if (!uid) return;
    setError(null);
    setNotice(null);
    setSavingBlock(true);
    const { error: err } = await supabase.from('blocked_users').upsert(
      {
        blocker_id: uid,
        blocked_id: otherUserId,
        reason: existingReport?.reason ?? null,
      },
      { onConflict: 'blocker_id,blocked_id' },
    );
    setSavingBlock(false);

    if (err) {
      setError('Blokiranje nije uspjelo. Pokusaj ponovo.');
      return;
    }

    setNotice('Korisnik je blokiran.');
    blockQ.refetch();
  };

  const unblockUser = async () => {
    if (!uid || !existingBlock) return;
    setError(null);
    setNotice(null);
    setSavingBlock(true);
    const { error: err } = await supabase
      .from('blocked_users')
      .delete()
      .eq('id', existingBlock.id)
      .eq('blocker_id', uid);
    setSavingBlock(false);

    if (err) {
      setError('Odblokiranje nije uspjelo. Pokusaj ponovo.');
      return;
    }

    setNotice('Korisnik je odblokiran.');
    blockQ.refetch();
  };

  if (!uid || uid === otherUserId) return null;

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">
        Sigurnost
      </h2>
      <p className="mt-0.5 text-slate-500 text-sm dark:text-slate-400">
        Prijavi problem ili blokiraj korisnika {otherUserName}.
      </p>

      {notice && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-green-700 text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-red-700 text-sm">
          {error}
        </div>
      )}

      {existingReport && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-amber-800 text-sm">
          Prijava je vec poslana. Status: {existingReport.status}.
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setReportOpen((open) => !open)}
          disabled={!!existingReport || savingReport}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white font-semibold text-amber-700 text-sm transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/60 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
        >
          <FlagIcon />
          Prijavi
        </button>
        <button
          type="button"
          onClick={existingBlock ? unblockUser : blockUser}
          disabled={savingBlock || blockQ.isLoading}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white font-semibold text-red-600 text-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          <BlockIcon />
          {existingBlock ? 'Odblokiraj' : 'Blokiraj'}
        </button>
      </div>

      {reportOpen && !existingReport && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <label className="block">
            <span className="mb-1.5 block font-medium text-slate-700 text-sm dark:text-slate-300">
              Razlog
            </span>
            <select
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as ReportReason)
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Detalji (opciono)"
            className="mt-3 w-full resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={submitReport}
            disabled={savingReport}
            className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-brand font-semibold text-sm text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Posalji prijavu
          </button>
        </div>
      )}
    </div>
  );
}
