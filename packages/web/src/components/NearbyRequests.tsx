import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PROBLEM_LABELS, type ProblemType } from '@/components/HelpRequestForm';
import { supabase } from '@/lib/supabase';

type NearbyRequest = {
  id: string;
  type: ProblemType;
  description: string | null;
  distance_m: number;
  approx_lat: number;
  approx_lng: number;
  created_at: string;
  already_offered: boolean;
};

const fmtDistance = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

const fmtAgo = (s: string) => {
  const mins = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (mins < 1) return 'upravo sada';
  if (mins < 60) return `prije ${mins} min`;
  const h = Math.round(mins / 60);
  return `prije ${h} h`;
};

// Helper-side discovery (#24 follow-up): open requests near the available
// helper, each with a one-tap "Ponudi pomoć". Rendered on Home while available.
export function NearbyRequests({ center }: { center: [number, number] }) {
  const queryClient = useQueryClient();
  const [lng, lat] = center;

  const requestsQ = useQuery({
    queryKey: ['nearby-requests', center],
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('find_nearby_requests', {
        lat,
        lng,
        radius_m: 15_000,
      });
      if (error) throw error;
      return data as NearbyRequest[];
    },
  });
  const requests = requestsQ.data ?? [];

  const offer = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('offer_help', {
        p_request_id: requestId,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['nearby-requests'] }),
  });

  if (requests.length === 0) return null;

  return (
    <div className="animate-fade-up rounded-2xl border border-white/30 bg-white/30 p-4 shadow-lg backdrop-blur-md backdrop-saturate-150 dark:border-white/10 dark:bg-slate-800/30">
      <div className="mb-2 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <h2 className="font-semibold text-slate-900 text-sm dark:text-slate-100">
          Zahtjevi u blizini
        </h2>
      </div>

      <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {requests.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3.5 py-2.5 dark:bg-slate-900/40"
          >
            <div className="min-w-0">
              <div className="font-medium text-slate-900 text-sm dark:text-slate-100">
                {PROBLEM_LABELS[r.type]}
                <span className="ml-2 font-normal text-slate-500 text-xs dark:text-slate-400">
                  {fmtDistance(r.distance_m)} · {fmtAgo(r.created_at)}
                </span>
              </div>
              {r.description && (
                <p className="truncate text-slate-500 text-xs dark:text-slate-400">
                  {r.description}
                </p>
              )}
            </div>

            {r.already_offered ? (
              <span className="shrink-0 rounded-lg bg-green-100 px-3 py-1.5 font-medium text-green-700 text-xs dark:bg-green-900/40 dark:text-green-300">
                Ponuda poslana ✓
              </span>
            ) : (
              <button
                type="button"
                onClick={() => offer.mutate(r.id)}
                disabled={offer.isPending}
                className="shrink-0 rounded-lg bg-brand px-3 py-1.5 font-semibold text-white text-xs transition hover:bg-brand-dark disabled:opacity-50"
              >
                Ponudi pomoć
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
