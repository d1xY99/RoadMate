import { Elysia, t } from 'elysia';
import type { AuthService } from './service';

export const createAuthHandler = (service: AuthService) =>
  new Elysia({ prefix: '/auth' }).post(
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
  );
