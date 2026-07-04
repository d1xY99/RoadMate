import { Elysia, t } from 'elysia';
import type { UserService } from './service';

export const createUserHandler = (service: UserService) =>
  new Elysia({ prefix: '/users' }).get(
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
  );
