import { Elysia, t } from 'elysia';
import type { AuthService } from './service';

export const createAuthHandler = (service: AuthService) =>
  new Elysia({ prefix: '/auth' })
    .post(
      '/sign-up',
      async ({ body, status }) => {
        const result = await service.signUp(
          body.email,
          body.password,
          body.full_name,
        );
        if (!result.success) {
          return status(400, {
            success: result.success,
            verificationRequired: result.verificationRequired,
            message: result.message,
          });
        }
        return result;
      },
      {
        body: t.Object({
          email: t.String({ format: 'email' }),
          password: t.String({ minLength: 8 }),
          full_name: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            verificationRequired: t.Boolean(),
            message: t.String(),
            userId: t.Optional(t.String()),
          }),
          400: t.Object({
            success: t.Boolean(),
            verificationRequired: t.Boolean(),
            message: t.String(),
          }),
        },
        detail: {
          tags: ['Authentication'],
          description:
            'Sign up a new user with email + password (via Supabase). Returns whether email verification is required.',
        },
      },
    )
    .post(
      '/sign-in',
      async ({ body, status }) => {
        const result = await service.signIn(body.email, body.password);
        if (!result.success) {
          return status(400, { success: false, message: result.message });
        }
        return result;
      },
      {
        body: t.Object({
          email: t.String({ format: 'email' }),
          password: t.String({ minLength: 8 }),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            accessToken: t.String(),
            refreshToken: t.String(),
            expiresAt: t.Optional(t.Number()),
            user: t.Object({
              id: t.String(),
              email: t.Optional(t.String()),
            }),
          }),
          400: t.Object({
            success: t.Boolean(),
            message: t.String(),
          }),
        },
        detail: {
          tags: ['Authentication'],
          description:
            'Sign in with email + password (via Supabase). Returns the session tokens.',
        },
      },
    )
    .post(
      '/sign-out',
      async ({ headers, status }) => {
        const auth = headers.authorization;
        const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
        if (!token) {
          return status(401, {
            success: false,
            message: 'Missing Bearer access token.',
          });
        }
        const result = await service.signOut(token);
        if (!result.success) {
          return status(400, result);
        }
        return result;
      },
      {
        response: {
          200: t.Object({ success: t.Boolean(), message: t.String() }),
          400: t.Object({ success: t.Boolean(), message: t.String() }),
          401: t.Object({ success: t.Boolean(), message: t.String() }),
        },
        detail: {
          tags: ['Authentication'],
          description:
            'Sign out (revoke the session) using the Bearer access token.',
        },
      },
    );
