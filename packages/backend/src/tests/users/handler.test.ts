import { describe, expect, it } from 'bun:test';
import { createUserHandler } from '../../users/handler';
import { createUserServiceMock } from '../../users/service.mock';

const app = createUserHandler(createUserServiceMock());

const AUTH = { authorization: 'Bearer mock-access-token' };

const get = (path: string, headers?: Record<string, string>) =>
  app.handle(new Request(`http://localhost${path}`, { headers }));

const patch = (
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

describe('user handler — GET /users', () => {
  it('returns a list of users', async () => {
    const res = await get('/users');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: { id: string }[] };
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.users[0]?.id).toBe('mock-user-id');
  });
});

describe('user handler — GET /users/me', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await get('/users/me');
    expect(res.status).toBe(401);
  });

  it('returns the profile with a valid token', async () => {
    const res = await get('/users/me', AUTH);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; fullName: string };
    expect(body.id).toBe('mock-user-id');
    expect(body.fullName).toBe('Mock Korisnik');
  });
});

describe('user handler — PATCH /users/me', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await patch('/users/me', { fullName: 'Novo Ime' });
    expect(res.status).toBe(401);
  });

  it('updates the profile with a valid token', async () => {
    const res = await patch(
      '/users/me',
      { fullName: 'Novo Ime', vehicleType: 'truck', phone: '+38761123456' },
      AUTH,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      fullName: string;
      vehicleType: string;
      phone: string;
    };
    expect(body.fullName).toBe('Novo Ime');
    expect(body.vehicleType).toBe('truck');
    expect(body.phone).toBe('+38761123456');
  });

  it('accepts null to clear an optional field', async () => {
    const res = await patch('/users/me', { phone: null }, AUTH);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { phone: string | null };
    expect(body.phone).toBeNull();
  });

  it('rejects an invalid vehicle type (422)', async () => {
    const res = await patch('/users/me', { vehicleType: 'boat' }, AUTH);
    expect(res.status).toBe(422);
  });
});
