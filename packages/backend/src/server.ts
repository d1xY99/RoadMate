import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { createAuthHandler } from './auth/handler';
import type { AuthService } from './auth/service';
import { createProfileHandler } from './profiles/handler';
import type { ProfileService } from './profiles/service';
import { createUserHandler } from './users/handler';
import type { UserService } from './users/service';
import { createVehicleHandler } from './vehicles/handler';
import type { VehicleService } from './vehicles/service';

export type ServerDeps = {
  authService: AuthService;
  userService: UserService;
  profileService: ProfileService;
  vehicleService: VehicleService;
};

export const createServer = (deps: ServerDeps) =>
  new Elysia()
    .use(cors())
    .use(swagger({ path: '/docs' }))
    .get('/health', () => ({ status: 'ok', service: 'roadmate-backend' }))
    .use(createAuthHandler(deps.authService))
    .use(createUserHandler(deps.userService))
    .use(
      createProfileHandler({
        userService: deps.userService,
        profileService: deps.profileService,
      }),
    )
    .use(createVehicleHandler(deps.vehicleService));

export type Server = ReturnType<typeof createServer>;
