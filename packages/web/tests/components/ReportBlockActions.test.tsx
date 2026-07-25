import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

type QueryConfig = {
  queryKey: unknown[];
  enabled?: boolean;
  queryFn: () => Promise<unknown>;
};

type MutationConfig = {
  mutationFn: (value: string) => Promise<unknown>;
  onSuccess?: () => void;
};

const queryResults = new Map<string, unknown>();
const queryConfigs: QueryConfig[] = [];
const mutationConfigs: MutationConfig[] = [];

const queryKeyId = (key: unknown[]) => JSON.stringify(key);

mock.module('@tanstack/react-query', () => ({
  useQuery: (config: QueryConfig) => {
    queryConfigs.push(config);
    return {
      data: queryResults.get(queryKeyId(config.queryKey)),
      isLoading: false,
      refetch: () => undefined,
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

mock.module('@/lib/auth', () => ({
  useAuth: (selector: (state: unknown) => unknown) =>
    selector({ session: { user: { id: 'user-1' } } }),
}));

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => {
      throw new Error('Supabase should not be called while rendering.');
    },
  },
}));

const { ReportBlockActions } = await import(
  '../../src/components/ReportBlockActions'
);

describe('ReportBlockActions', () => {
  beforeEach(() => {
    queryResults.clear();
    queryConfigs.length = 0;
    mutationConfigs.length = 0;
  });

  it('renders report and block actions for another user', () => {
    const html = renderToStaticMarkup(
      <ReportBlockActions
        requestId="request-1"
        otherUserId="user-2"
        otherUserName="Amina"
      />,
    );

    expect(html).toContain('Sigurnost');
    expect(html).toContain('Amina');
    expect(html).toContain('Prijavi');
    expect(html).toContain('Blokiraj');
    expect(queryConfigs.map((config) => config.queryKey)).toEqual([
      ['report', 'request-1', 'user-1', 'user-2'],
      ['blocked-user', 'user-1', 'user-2'],
    ]);
  });

  it('shows existing report and unblock action when records exist', () => {
    queryResults.set(queryKeyId(['report', 'request-1', 'user-1', 'user-2']), {
      id: 'report-1',
      status: 'open',
      reason: 'Nesigurno ponasanje',
    });
    queryResults.set(queryKeyId(['blocked-user', 'user-1', 'user-2']), {
      id: 'block-1',
      reason: null,
    });

    const html = renderToStaticMarkup(
      <ReportBlockActions
        requestId="request-1"
        otherUserId="user-2"
        otherUserName="Amina"
      />,
    );

    expect(html).toContain('Prijava je vec poslana');
    expect(html).toContain('Status: open');
    expect(html).toContain('Odblokiraj');
  });

  it('does not render actions for yourself', () => {
    const html = renderToStaticMarkup(
      <ReportBlockActions
        requestId="request-1"
        otherUserId="user-1"
        otherUserName="You"
      />,
    );

    expect(html).toBe('');
  });
});
