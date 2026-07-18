import type { VehicleService } from './service';

export const createVehicleServiceMock = (
  overrides?: Partial<VehicleService>,
): VehicleService => ({
  decodeVin: async () => ({
    vin: '1HGCM82633A004352',
    vinValid: true,
    make: 'Honda',
    model: 'Accord',
    trim: 'EX',
    body: 'Coupe',
    engine: '3.0L V6',
    transmission: 'Automatic',
    vehicle: {
      vin: '1HGCM82633A004352',
      year: 2003,
      make: 'Honda',
      model: 'Accord',
      manufacturer: 'American Honda Motor Co., Inc.',
    },
  }),
  ...overrides,
});
