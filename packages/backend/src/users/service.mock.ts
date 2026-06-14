import type { UserService } from './service';

export const createUserServiceMock = (): UserService => ({
  getUsers: async () => [
    {
      id: 'mock-user-id',
      email: 'mock@roadmate.dev',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
});
