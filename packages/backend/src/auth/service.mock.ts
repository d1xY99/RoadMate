import type { AuthService } from './service';

const mockSession = {
  success: true as const,
  message: 'mock session',
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: 9999999999,
  user: { id: 'mock-user-id', email: 'mock@roadmate.dev' },
};

export const createAuthServiceMock = (): AuthService => ({
  signUp: async (_email, _password, _fullName) => ({
    success: true,
    verificationRequired: true,
    message: 'mock sign-up',
    userId: 'mock-user-id',
  }),
  signIn: async (_email, _password) => mockSession,
  refresh: async (_refreshToken) => mockSession,
  signOut: async (_accessToken) => ({
    success: true,
    message: 'mock sign-out',
  }),
});
