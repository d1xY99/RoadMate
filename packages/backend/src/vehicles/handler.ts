import { Elysia, t } from 'elysia';
import { VehicleDecodeError, type VehicleService } from './service';

const messageResponse = t.Object({
  success: t.Boolean(),
  message: t.String(),
});

const autoDevVinResponse = t.Object({
  vin: t.Optional(t.String()),
  vinValid: t.Optional(t.Boolean()),
  wmi: t.Optional(t.String()),
  origin: t.Optional(t.String()),
  squishVin: t.Optional(t.String()),
  checkDigit: t.Optional(t.String()),
  checksum: t.Optional(t.Boolean()),
  type: t.Optional(t.String()),
  make: t.Optional(t.String()),
  model: t.Optional(t.String()),
  trim: t.Optional(t.String()),
  style: t.Optional(t.String()),
  body: t.Optional(t.String()),
  engine: t.Optional(t.String()),
  drive: t.Optional(t.String()),
  transmission: t.Optional(t.String()),
  vehicle: t.Optional(
    t.Object({
      vin: t.Optional(t.String()),
      year: t.Optional(t.Number()),
      make: t.Optional(t.String()),
      model: t.Optional(t.String()),
      manufacturer: t.Optional(t.String()),
    }),
  ),
  ambiguous: t.Optional(t.Boolean()),
});

const responseStatus = (code: number) => {
  if (code === 400 || code === 404 || code === 429 || code === 503) {
    return code;
  }
  return 502;
};

export const createVehicleHandler = (vehicleService: VehicleService) =>
  new Elysia({ prefix: '/vehicles' }).get(
    '/decode-vin/:vin',
    async ({ params, status }) => {
      try {
        return await vehicleService.decodeVin(params.vin);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not decode VIN.';
        const code =
          err instanceof VehicleDecodeError ? responseStatus(err.status) : 502;
        return status(code, { success: false, message });
      }
    },
    {
      params: t.Object({ vin: t.String() }),
      response: {
        200: autoDevVinResponse,
        400: messageResponse,
        404: messageResponse,
        429: messageResponse,
        502: messageResponse,
        503: messageResponse,
      },
      detail: {
        tags: ['Vehicles'],
        description:
          'Decode a VIN through Auto.dev without exposing the API key to the browser.',
      },
    },
  );
