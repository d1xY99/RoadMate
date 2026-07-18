import { createAuthService } from './auth/service';
import { env } from './libs/config';
import {
  createSupabaseClient,
  createSupabaseServiceClient,
} from './libs/supabase';
import { createProfileService } from './profiles/service';
import { createServer } from './server';
import { createUserService } from './users/service';
import { createVehicleService } from './vehicles/service';

// Build dependencies, then the server
const anonClient = createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey);
const serviceClient = createSupabaseServiceClient(
  env.supabaseUrl,
  env.supabaseServiceKey,
);

const authService = createAuthService({ anonClient, serviceClient });
const userService = createUserService({ serviceClient });
const profileService = createProfileService({ serviceClient });
const vehicleService = createVehicleService({
  autoDevApiKey: env.autoDevApiKey,
});

const app = createServer({
  authService,
  userService,
  profileService,
  vehicleService,
});

app.listen(env.port, () => {
  console.log(`🚗 RoadMate backend listening on :${env.port}`);
  console.log(`   Swagger UI at http://localhost:${env.port}/docs`);
});
