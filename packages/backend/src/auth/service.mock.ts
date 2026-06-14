import type { AuthService } from './service';

export const createAuthServiceMock = (): AuthService => ({
  signUp: async (_email, _password, _fullName) => ({
    success: true,
    verificationRequired: true,
    message: 'mock sign-up',
    userId: 'mock-user-id',
  }),
});
