import { describe, expect, it } from 'bun:test';
import { createAuthHandler } from '../../auth/handler';
import { createAuthServiceMock } from '../../auth/service.mock';

const app = createAuthHandler(createAuthServiceMock());

const post = (path: string, body?: unknown, headers?: Record<string, string>) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

describe('auth handler — POST /auth/sign-up', () => {
  it('succeeds with a valid email + password', async () => {
    const res = await post('/auth/sign-up', {
      email: 'a@b.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('rejects an invalid email (422)', async () => {
    const res = await post('/auth/sign-up', {
      email: 'not-an-email',
      password: 'password123',
    });
    expect(res.status).toBe(422);
  });

  it('rejects a too-short password (422)', async () => {
    const res = await post('/auth/sign-up', {
      email: 'a@b.com',
      password: 'short',
    });
    expect(res.status).toBe(422);
  });
});

describe('auth handler — POST /auth/sign-in', () => {
  it('returns session tokens for valid credentials', async () => {
    const res = await post('/auth/sign-in', {
      email: 'a@b.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      accessToken: string;
    };
    expect(body.success).toBe(true);
    expect(body.accessToken).toBe('mock-access-token');
  });

  it('rejects an invalid email (422)', async () => {
    const res = await post('/auth/sign-in', {
      email: 'nope',
      password: 'password123',
    });
    expect(res.status).toBe(422);
  });
});

describe('auth handler — POST /auth/refresh', () => {
  it('returns new session tokens for a valid refresh token', async () => {
    const res = await post('/auth/refresh', { refreshToken: 'some-refresh' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      accessToken: string;
    };
    expect(body.success).toBe(true);
    expect(body.accessToken).toBe('mock-access-token');
  });

  it('rejects a missing refresh token (422)', async () => {
    const res = await post('/auth/refresh', {});
    expect(res.status).toBe(422);
  });
});

describe('auth handler — POST /auth/sign-out', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await post('/auth/sign-out');
    expect(res.status).toBe(401);
  });

  it('succeeds with a Bearer token', async () => {
    const res = await post('/auth/sign-out', undefined, {
      authorization: 'Bearer some-access-token',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
