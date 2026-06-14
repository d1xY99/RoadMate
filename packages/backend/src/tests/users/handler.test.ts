import { describe, expect, it } from 'bun:test';
import { createUserHandler } from '../../users/handler';
import { createUserServiceMock } from '../../users/service.mock';

const app = createUserHandler(createUserServiceMock());

describe('user handler — GET /users', () => {
  it('returns a list of users', async () => {
    const res = await app.handle(new Request('http://localhost/users'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: { id: string }[] };
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.users[0]?.id).toBe('mock-user-id');
  });
});
