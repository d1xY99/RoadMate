import { Elysia, t } from 'elysia';
import type { UserService } from './service';

// Extract a Bearer access token from an Authorization header.
const bearer = (authorization?: string): string | undefined =>
  authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

const vehicleType = t.Union([
  t.Literal('car'),
  t.Literal('van'),
  t.Literal('truck'),
  t.Literal('motorcycle'),
  t.Literal('suv_4x4'),
]);

const profileResponse = t.Object({
  id: t.String(),
  fullName: t.String(),
  phone: t.Union([t.String(), t.Null()]),
  photoUrl: t.Union([t.String(), t.Null()]),
  vehicleType: t.Union([vehicleType, t.Null()]),
  isAvailable: t.Boolean(),
  thumbsUp: t.Number(),
  thumbsDown: t.Number(),
  createdAt: t.String(),
});

const messageResponse = t.Object({
  success: t.Boolean(),
  message: t.String(),
});

export const createUserHandler = (service: UserService) =>
  new Elysia({ prefix: '/users' })
    .get(
      '/',
      async () => {
        const users = await service.getUsers();
        return { users };
      },
      {
        response: {
          200: t.Object({
            users: t.Array(
              t.Object({
                id: t.String(),
                email: t.Optional(t.String()),
                createdAt: t.String(),
              }),
            ),
          }),
        },
        detail: {
          tags: ['Users'],
          description:
            'List all users (admin / service-role). Protect with auth + RBAC before exposing publicly.',
        },
      },
    )
    .get(
      '/me',
      async ({ headers, status }) => {
        const token = bearer(headers.authorization);
        if (!token) {
          return status(401, {
            success: false,
            message: 'Missing Bearer access token.',
          });
        }
        const user = await service.getUserFromToken(token);
        if (!user) {
          return status(401, {
            success: false,
            message: 'Invalid or expired access token.',
          });
        }
        const profile = await service.getProfile(user.id);
        if (!profile) {
          return status(404, {
            success: false,
            message: 'Profile not found.',
          });
        }
        return profile;
      },
      {
        response: {
          200: profileResponse,
          401: messageResponse,
          404: messageResponse,
        },
        detail: {
          tags: ['Users'],
          description:
            "Read the authenticated user's own profile (via Bearer access token).",
        },
      },
    )
    .patch(
      '/me',
      async ({ headers, body, status }) => {
        const token = bearer(headers.authorization);
        if (!token) {
          return status(401, {
            success: false,
            message: 'Missing Bearer access token.',
          });
        }
        const user = await service.getUserFromToken(token);
        if (!user) {
          return status(401, {
            success: false,
            message: 'Invalid or expired access token.',
          });
        }
        const profile = await service.updateProfile(user.id, {
          fullName: body.fullName,
          phone: body.phone,
          vehicleType: body.vehicleType,
          photoUrl: body.photoUrl,
        });
        if (!profile) {
          return status(404, {
            success: false,
            message: 'Profile not found.',
          });
        }
        return profile;
      },
      {
        body: t.Object({
          fullName: t.Optional(t.String({ minLength: 1 })),
          phone: t.Optional(t.Union([t.String(), t.Null()])),
          vehicleType: t.Optional(t.Union([vehicleType, t.Null()])),
          photoUrl: t.Optional(
            t.Union([t.String({ format: 'uri' }), t.Null()]),
          ),
        }),
        response: {
          200: profileResponse,
          401: messageResponse,
          404: messageResponse,
        },
        detail: {
          tags: ['Users'],
          description:
            "Update the authenticated user's own profile (name, phone, vehicle type, photo).",
        },
      },
    );
