import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

type QueryConfig = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  refetchInterval?: number;
};

type MutationConfig = {
  mutationFn: (value: string) => Promise<unknown>;
  onSuccess?: () => void;
};

const queryResults = new Map<string, unknown>();
const queryConfigs: QueryConfig[] = [];
const mutationConfigs: MutationConfig[] = [];
const rpcCalls: { name: string; args: unknown }[] = [];
let rpcResult: { data: unknown; error: unknown };

const queryKeyId = (key: unknown[]) => JSON.stringify(key);

mock.module('@tanstack/react-query', () => ({
  useQuery: (config: QueryConfig) => {
    queryConfigs.push(config);
    return {
      data: queryResults.get(queryKeyId(config.queryKey)),
      isLoading: false,
    };
  },
  useMutation: (config: MutationConfig) => {
    mutationConfigs.push(config);
    return {
      isPending: false,
      mutate: (value: string) => config.mutationFn(value),
    };
  },
  useQueryClient: () => ({
    invalidateQueries: () => undefined,
  }),
}));

mock.module('@/lib/supabase', () => ({
  supabase: {
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      return rpcResult;
    },
  },
}));

const { RequestOffers } = await import('../../src/components/RequestOffers');

describe('RequestOffers', () => {
  beforeEach(() => {
    queryResults.clear();
    queryConfigs.length = 0;
    mutationConfigs.length = 0;
    rpcCalls.length = 0;
    rpcResult = { data: [], error: null };
  });

  it('loads offers for the open request', async () => {
    renderToStaticMarkup(
      <RequestOffers requestId="request-1" onAccepted={() => undefined} />,
    );

    const result = await queryConfigs[0]?.queryFn();

    expect(result).toEqual([]);
    expect(rpcCalls).toEqual([
      {
        name: 'list_request_offers',
        args: { p_request_id: 'request-1' },
      },
    ]);
    expect(queryConfigs[0]?.queryKey).toEqual(['request-offers', 'request-1']);
    expect(queryConfigs[0]?.refetchInterval).toBe(15_000);
  });

  it('shows an empty state while waiting for helpers', () => {
    const html = renderToStaticMarkup(
      <RequestOffers requestId="request-1" onAccepted={() => undefined} />,
    );

    expect(html).toContain('Ponude');
    expect(html).toContain('Još nema ponuda');
  });

  it('renders incoming helper offers with profile and distance details', () => {
    queryResults.set(queryKeyId(['request-offers', 'request-1']), [
      {
        offer_id: 'offer-1',
        helper_id: 'helper-1',
        full_name: 'Amina Helper',
        vehicle_type: 'suv_4x4',
        thumbs_up: 7,
        thumbs_down: 1,
        eta_minutes: 12,
        distance_m: 1280,
        created_at: new Date().toISOString(),
      },
    ]);

    const html = renderToStaticMarkup(
      <RequestOffers requestId="request-1" onAccepted={() => undefined} />,
    );

    expect(html).toContain('Ponude');
    expect(html).toContain('(1)');
    expect(html).toContain('Amina Helper');
    expect(html).toContain('Terenac');
    expect(html).toContain('1.3 km');
    expect(html).toContain('~12 min');
    expect(html).toContain('Prihvati');
  });

  it('accepts an offer and notifies the parent view to refresh', async () => {
    let accepted = false;
    renderToStaticMarkup(
      <RequestOffers
        requestId="request-1"
        onAccepted={() => {
          accepted = true;
        }}
      />,
    );

    rpcResult = { data: 'request-1', error: null };
    await mutationConfigs[0]?.mutationFn('offer-1');
    mutationConfigs[0]?.onSuccess?.();

    expect(rpcCalls).toEqual([
      {
        name: 'accept_offer',
        args: { p_offer_id: 'offer-1' },
      },
    ]);
    expect(accepted).toBe(true);
  });
});
