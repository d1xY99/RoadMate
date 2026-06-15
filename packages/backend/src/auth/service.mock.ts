import type { AuthService } from './service';

export const createAuthServiceMock = (): AuthService => ({
  signUp: async (_email, _password, _fullName) => ({
    success: true,
    verificationRequired: true,
    message: 'mock sign-up',
    userId: 'mock-user-id',
  }),
  signIn: async (_email, _password) => ({
    success: true,
    message: 'mock sign-in',
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: 9999999999,
    user: { id: 'mock-user-id', email: 'mock@roadmate.dev' },
  }),
  signOut: async (_accessToken) => ({
    success: true,
    message: 'mock sign-out',
  }),
});
