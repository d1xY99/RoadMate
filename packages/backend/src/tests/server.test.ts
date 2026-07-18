import { describe, expect, it } from 'bun:test';
import { createAuthServiceMock } from '../auth/service.mock';
import { createProfileServiceMock } from '../profiles/service.mock';
import { createServer } from '../server';
import { createUserServiceMock } from '../users/service.mock';
import { createVehicleServiceMock } from '../vehicles/service.mock';

const app = createServer({
  authService: createAuthServiceMock(),
  userService: createUserServiceMock(),
  profileService: createProfileServiceMock(),
  vehicleService: createVehicleServiceMock(),
});

describe('server', () => {
  it('GET /health returns ok', async () => {
    const res = await app.handle(new Request('http://localhost/health'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('roadmate-backend');
  });

  it('unknown route returns 404', async () => {
    const res = await app.handle(
      new Request('http://localhost/does-not-exist'),
    );
    expect(res.status).toBe(404);
  });

  it('GET /vehicles/decode-vin/:vin returns decoded vehicle data', async () => {
    const res = await app.handle(
      new Request('http://localhost/vehicles/decode-vin/1HGCM82633A004352'),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { make: string; model: string };
    expect(body.make).toBe('Honda');
    expect(body.model).toBe('Accord');
  });
});
