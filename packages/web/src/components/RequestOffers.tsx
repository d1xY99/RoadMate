import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type Offer = {
  offer_id: string;
  helper_id: string;
  full_name: string | null;
  vehicle_type: string | null;
  thumbs_up: number;
  thumbs_down: number;
  eta_minutes: number | null;
  distance_m: number | null;
  created_at: string;
};

const VEHICLE_LABELS: Record<string, string> = {
  car: 'Auto',
  van: 'Kombi',
  truck: 'Kamion',
  motorcycle: 'Motor',
  suv_4x4: 'Terenac',
};

const fmtDistance = (m: number | null) =>
  m == null
    ? null
    : m < 1000
      ? `${Math.round(m)} m`
      : `${(m / 1000).toFixed(1)} km`;

// Requester-side of the handshake (#24 follow-up): incoming offers on an open
// request, each acceptable in one tap. Accepting flips the request to
// 'accepted' (server-side) and the parent refetches into the tracking/chat UI.
export function RequestOffers({
  requestId,
  onAccepted,
}: {
  requestId: string;
  onAccepted: () => void;
}) {
  const offersQ = useQuery({
    queryKey: ['request-offers', requestId],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_request_offers', {
        p_request_id: requestId,
      });
      if (error) throw error;
      return data as Offer[];
    },
  });
  const offers = offersQ.data ?? [];

  const accept = useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase.rpc('accept_offer', {
        p_offer_id: offerId,
      });
      if (error) throw error;
    },
    onSuccess: onAccepted,
  });

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900">
        Ponude{' '}
        {offers.length > 0 && (
          <span className="text-slate-400">({offers.length})</span>
        )}
      </h2>

      {offers.length === 0 ? (
        <p className="mt-3 text-slate-400 text-sm">
          Još nema ponuda — čekamo pomagača u blizini.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {offers.map((o) => {
            const dist = fmtDistance(o.distance_m);
            return (
              <li key={o.offer_id} className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white">
                  {(o.full_name?.[0] ?? '?').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">
                    {o.full_name || 'Pomagač'}
                  </div>
                  <div className="text-slate-500 text-sm">
                    {o.vehicle_type
                      ? (VEHICLE_LABELS[o.vehicle_type] ?? o.vehicle_type)
                      : 'Vozilo nepoznato'}{' '}
                    · 👍 {o.thumbs_up} · 👎 {o.thumbs_down}
                    {dist && ` · ${dist}`}
                    {o.eta_minutes != null && ` · ~${o.eta_minutes} min`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => accept.mutate(o.offer_id)}
                  disabled={accept.isPending}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 font-semibold text-sm text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  Prihvati
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
