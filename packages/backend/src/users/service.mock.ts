import type { UserService } from './service';

export const createUserServiceMock = (): UserService => ({
  getUsers: async () => [
    {
      id: 'mock-user-id',
      email: 'mock@roadmate.dev',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  // Any non-empty token resolves to the mock user; empty/invalid → null.
  getUserFromToken: async (token) =>
    token ? { id: 'mock-user-id', email: 'mock@roadmate.dev' } : null,
});
