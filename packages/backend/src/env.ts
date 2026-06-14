// Centralised, validated environment access.
function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? 'info',

  dbUrl: required('DB_URL'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  natsUrl: process.env.NATS_URL ?? 'nats://localhost:4222',

  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',

  jwtSecret: process.env.JWT_SECRET ?? 'change-me',

  match: {
    radiusM: Number(process.env.MATCH_RADIUS_M ?? 15000),
    radiusMaxM: Number(process.env.MATCH_RADIUS_MAX_M ?? 30000),
    helperStaleMinutes: Number(process.env.HELPER_STALE_MINUTES ?? 20),
  },
} as const;
