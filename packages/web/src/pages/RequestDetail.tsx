import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { PROBLEM_LABELS, type ProblemType } from '@/components/HelpRequestForm';
import { Logo } from '@/components/Logo';
import { RequestFeedback } from '@/components/RequestFeedback';
import { RequestTracking } from '@/components/RequestTracking';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Status = 'open' | 'accepted' | 'resolved' | 'cancelled';

type HelpRequest = {
  id: string;
  type: ProblemType;
  description: string | null;
  status: Status;
  requester_id: string;
  helper_id: string | null;
  created_at: string;
  accepted_at: string | null;
  resolved_at: string | null;
  cancelled_at: string | null;
};

type Helper = {
  full_name: string;
  vehicle_type: string | null;
  phone: string | null;
  thumbs_up: number;
  thumbs_down: number;
};

const STATUS_META: Record<
  Status,
  { label: string; sub: string; badge: string; dot: string }
> = {
  open: {
    label: 'Otvoren',
    sub: 'Čeka pomagača…',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  accepted: {
    label: 'Prihvaćen',
    sub: 'Pomagač je na putu.',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
  resolved: {
    label: 'Riješen',
    sub: 'Zahtjev je završen.',
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
  },
  cancelled: {
    label: 'Otkazan',
    sub: 'Zahtjev je otkazan.',
    badge: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  },
};

const VEHICLE_LABELS: Record<string, string> = {
  car: 'Auto',
  van: 'Kombi',
  truck: 'Kamion',
  motorcycle: 'Motor',
  suv_4x4: 'Terenac',
};

const fmtTime = (s: string) =>
  new Date(s).toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export function RequestDetail() {
  const navigate = useNavigate();
  const { id } = useParams({ strict: false }) as { id: string };

  const requestQ = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_requests')
        .select(
          'id, type, description, status, requester_id, helper_id, created_at, accepted_at, resolved_at, cancelled_at',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as HelpRequest | null) ?? null;
    },
  });
  const request = requestQ.data;

  const helperQ = useQuery({
    queryKey: ['helper', request?.helper_id],
    enabled: !!request?.helper_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, vehicle_type, phone, thumbs_up, thumbs_down')
        .eq('id', request?.helper_id as string)
        .maybeSingle();
      if (error) throw error;
      return (data as Helper | null) ?? null;
    },
  });
  const helper = helperQ.data;

  const uid = useAuth((s) => s.session?.user.id);
  const role: 'requester' | 'helper' =
    request?.helper_id === uid ? 'helper' : 'requester';

  const setStatus = async (status: Status) => {
    if (!request) return;
    const stamp =
      status === 'resolved'
        ? 'resolved_at'
        : status === 'cancelled'
          ? 'cancelled_at'
          : null;
    await supabase
      .from('help_requests')
      .update({
        status,
        ...(stamp ? { [stamp]: new Date().toISOString() } : {}),
      })
      .eq('id', request.id);
    requestQ.refetch();
  };

  if (requestQ.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        Učitavanje...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <p className="text-slate-500">Zahtjev nije pronađen.</p>
        <Link
          to="/"
          className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-sm text-white hover:bg-brand-dark"
        >
          Nazad na kartu
        </Link>
      </div>
    );
  }

  const meta = STATUS_META[request.status];
  const active = request.status === 'open' || request.status === 'accepted';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 flex items-center justify-between border-slate-200 border-b bg-white/80 px-6 py-4 backdrop-blur">
        <Link to="/">
          <Logo />
        </Link>
        <Link
          to="/"
          className="text-slate-500 text-sm transition hover:text-slate-800"
        >
          ← Karta
        </Link>
      </header>

      <main className="mx-auto max-w-lg p-4 sm:p-6">
        <h1 className="font-bold text-2xl text-slate-900">Detalji zahtjeva</h1>

        {/* Status + tip */}
        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-lg text-slate-900">
                {PROBLEM_LABELS[request.type]}
              </div>
              <div className="mt-0.5 text-slate-500 text-sm">{meta.sub}</div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-xs ${meta.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>

          {request.description && (
            <p className="mt-4 rounded-lg bg-slate-50 px-3.5 py-2.5 text-slate-700 text-sm">
              {request.description}
            </p>
          )}

          {/* Vremenska linija */}
          <dl className="mt-4 space-y-1.5 text-sm">
            <Row label="Kreiran" value={fmtTime(request.created_at)} />
            {request.accepted_at && (
              <Row label="Prihvaćen" value={fmtTime(request.accepted_at)} />
            )}
            {request.resolved_at && (
              <Row label="Riješen" value={fmtTime(request.resolved_at)} />
            )}
            {request.cancelled_at && (
              <Row label="Otkazan" value={fmtTime(request.cancelled_at)} />
            )}
          </dl>
        </div>

        {/* Live praćenje (#28) — nakon prihvata */}
        {request.status === 'accepted' && (
          <RequestTracking
            requestId={request.id}
            role={role}
            helperName={helper?.full_name ?? 'Pomagač'}
            helperVehicle={helper?.vehicle_type ?? null}
          />
        )}

        {/* Pomagač */}
        {request.helper_id && (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Pomagač</h2>
            <div className="mt-3 flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-lg text-white">
                {(helper?.full_name?.[0] ?? '?').toUpperCase()}
              </span>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">
                  {helper?.full_name || 'Pomagač'}
                </div>
                <div className="text-slate-500 text-sm">
                  {helper?.vehicle_type
                    ? (VEHICLE_LABELS[helper.vehicle_type] ??
                      helper.vehicle_type)
                    : 'Vozilo nepoznato'}{' '}
                  · 👍 {helper?.thumbs_up ?? 0} · 👎 {helper?.thumbs_down ?? 0}
                </div>
              </div>
            </div>

            {helper?.phone && (
              <a
                href={`tel:${helper.phone}`}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-sm text-white transition hover:bg-brand-dark"
              >
                📞 Nazovi pomagača
              </a>
            )}
          </div>
        )}

        {/* Ocjenjivanje (#31) — nakon završetka */}
        {request.status === 'resolved' &&
          (() => {
            const toUser =
              role === 'requester' ? request.helper_id : request.requester_id;
            return toUser ? (
              <RequestFeedback requestId={request.id} toUser={toUser} />
            ) : null;
          })()}

        {/* Akcije */}
        {active && (
          <div className="mt-4 flex flex-col gap-2">
            {request.status === 'accepted' && (
              <button
                type="button"
                onClick={() => setStatus('resolved')}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-sm text-white transition hover:brightness-110"
              >
                Označi riješeno
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                await setStatus('cancelled');
                navigate({ to: '/' });
              }}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-red-200 bg-white font-semibold text-red-600 text-sm transition hover:bg-red-50"
            >
              Otkaži zahtjev
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}
