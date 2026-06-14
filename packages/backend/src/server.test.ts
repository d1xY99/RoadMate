import { describe, expect, it } from 'bun:test';
import { app } from './server';

describe('server', () => {
  it('GET /health returns ok', async () => {
    const res = await app.handle(new Request('http://localhost/health'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('roadmate-backend');
  });

  it('unknown route returns 404', async () => {
    const res = await app.handle(
      new Request('http://localhost/does-not-exist'),
    );
    expect(res.status).toBe(404);
  });
});
