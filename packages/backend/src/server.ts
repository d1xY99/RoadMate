import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { createAuthHandler } from './auth/handler';
import type { AuthService } from './auth/service';
import { createUserHandler } from './users/handler';
import type { UserService } from './users/service';

export type ServerDeps = {
  authService: AuthService;
  userService: UserService;
};

export const createServer = (deps: ServerDeps) =>
  new Elysia()
    .use(cors())
    .use(swagger({ path: '/docs' }))
    .get('/health', () => ({ status: 'ok', service: 'roadmate-backend' }))
    .use(createAuthHandler(deps.authService))
    .use(createUserHandler(deps.userService));

export type Server = ReturnType<typeof createServer>;
