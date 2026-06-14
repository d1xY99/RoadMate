import { describe, expect, it } from 'bun:test';
import { createAuthHandler } from '../../auth/handler';
import { createAuthServiceMock } from '../../auth/service.mock';

const app = createAuthHandler(createAuthServiceMock());

const signUp = (body: unknown) =>
  app.handle(
    new Request('http://localhost/auth/sign-up', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

describe('auth handler — POST /auth/sign-up', () => {
  it('succeeds with a valid email + password', async () => {
    const res = await signUp({ email: 'a@b.com', password: 'password123' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('rejects an invalid email (422)', async () => {
    const res = await signUp({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(res.status).toBe(422);
  });

  it('rejects a too-short password (422)', async () => {
    const res = await signUp({ email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(422);
  });
});
