import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';

// Feature route modules live next to their domain (auth/, users/, requests/...).
// They are mounted here as they get implemented.
//
//   import { authRoutes } from './auth';
//   import { userRoutes } from './users';
//   import { requestRoutes } from './requests';

export const app = new Elysia()
  .use(cors())
  .use(swagger({ path: '/docs' }))
  .get('/health', () => ({ status: 'ok', service: 'roadmate-backend' }));
// .use(authRoutes)
// .use(userRoutes)
// .use(requestRoutes);

export type App = typeof app;
