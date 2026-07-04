import { Elysia, t } from 'elysia';
import type { UserService } from '../users/service';
import type { ProfileService } from './service';

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

// Own-profile endpoints (#38), backed by the profiles domain (#42). Mounted
// under /users so the public route stays /users/me; profile storage lives in
// ProfileService, token resolution in UserService.
export const createProfileHandler = (deps: {
  userService: UserService;
  profileService: ProfileService;
}) => {
  const { userService, profileService } = deps;

  return new Elysia({ prefix: '/users' })
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
        const user = await userService.getUserFromToken(token);
        if (!user) {
          return status(401, {
            success: false,
            message: 'Invalid or expired access token.',
          });
        }
        const profile = await profileService.getProfile(user.id);
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
          tags: ['Profiles'],
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
        const user = await userService.getUserFromToken(token);
        if (!user) {
          return status(401, {
            success: false,
            message: 'Invalid or expired access token.',
          });
        }
        const profile = await profileService.updateProfile(user.id, {
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
          tags: ['Profiles'],
          description:
            "Update the authenticated user's own profile (name, phone, vehicle type, photo).",
        },
      },
    );
};
