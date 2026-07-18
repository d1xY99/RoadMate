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
const invalidations: unknown[] = [];
const rpcCalls: { name: string; args: unknown }[] = [];
let rpcResult: { data: unknown; error: unknown };

const queryKeyId = (key: unknown[]) => JSON.stringify(key);

mock.module('@tanstack/react-query', () => ({
  useQuery: (config: QueryConfig) => {
    queryConfigs.push(config);
    return {
      data: queryResults.get(queryKeyId(config.queryKey)),
      isLoading: false,
      isSuccess: true,
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
    invalidateQueries: (args: unknown) => invalidations.push(args),
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

const { NearbyRequests } = await import('../../src/components/NearbyRequests');

describe('NearbyRequests', () => {
  beforeEach(() => {
    queryResults.clear();
    queryConfigs.length = 0;
    mutationConfigs.length = 0;
    invalidations.length = 0;
    rpcCalls.length = 0;
    rpcResult = { data: [], error: null };
  });

  it('loads nearby open requests for the helper location', async () => {
    renderToStaticMarkup(<NearbyRequests center={[15.98, 45.81]} />);

    const result = await queryConfigs[0]?.queryFn();

    expect(result).toEqual([]);
    expect(rpcCalls).toEqual([
      {
        name: 'find_nearby_requests',
        args: { lat: 45.81, lng: 15.98, radius_m: 15_000 },
      },
    ]);
    expect(queryConfigs[0]?.queryKey).toEqual([
      'nearby-requests',
      [15.98, 45.81],
    ]);
    expect(queryConfigs[0]?.refetchInterval).toBe(20_000);
  });

  it('renders request details and hides offer action after an offer is sent', () => {
    queryResults.set(queryKeyId(['nearby-requests', [15.98, 45.81]]), [
      {
        id: 'request-1',
        type: 'flat_tire',
        description: 'Pukla guma kod pumpe',
        distance_m: 850,
        approx_lat: 45.81,
        approx_lng: 15.98,
        created_at: new Date().toISOString(),
        already_offered: false,
      },
      {
        id: 'request-2',
        type: 'dead_battery',
        description: null,
        distance_m: 1420,
        approx_lat: 45.812,
        approx_lng: 15.982,
        created_at: new Date().toISOString(),
        already_offered: true,
      },
    ]);

    const html = renderToStaticMarkup(
      <NearbyRequests center={[15.98, 45.81]} />,
    );

    expect(html).toContain('Zahtjevi u blizini');
    expect(html).toContain('Guma');
    expect(html).toContain('Pukla guma kod pumpe');
    expect(html).toContain('850 m');
    expect(html).toContain('Akumulator');
    expect(html).toContain('1.4 km');
    expect(html).toContain('Ponudi pomoć');
    expect(html).toContain('Ponuda poslana');
  });

  it('offers help and refreshes nearby requests after success', async () => {
    renderToStaticMarkup(<NearbyRequests center={[15.98, 45.81]} />);

    rpcResult = { data: 'offer-1', error: null };
    await mutationConfigs[0]?.mutationFn('request-1');
    mutationConfigs[0]?.onSuccess?.();

    expect(rpcCalls).toEqual([
      {
        name: 'offer_help',
        args: { p_request_id: 'request-1' },
      },
    ]);
    expect(invalidations).toEqual([{ queryKey: ['nearby-requests'] }]);
  });
});
