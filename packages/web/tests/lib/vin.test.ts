import { afterEach, describe, expect, it, mock } from 'bun:test';
import {
  decodeVin,
  isValidVin,
  mapAutoDevDecodeResult,
  mapVinDecodeResult,
  normalizeVin,
  VinDecodeError,
} from '../../src/lib/vin';

const originalFetch = globalThis.fetch;

describe('VIN helpers', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('normalizes and validates VIN input', () => {
    expect(normalizeVin(' 1hg-cm82633a004352 ')).toBe('1HGCM82633A004352');
    expect(isValidVin('1HGCM82633A004352')).toBe(true);
    expect(isValidVin('1HGCM82633A00435I')).toBe(false);
    expect(isValidVin('short')).toBe(false);
  });

  it('maps NHTSA VIN decode data into vehicle fields', () => {
    const vehicle = mapVinDecodeResult({
      VIN: '1HGCM82633A004352',
      Make: 'HONDA',
      Model: 'Accord',
      ModelYear: '2003',
      Series: 'EX-L',
      Trim: 'EX',
      BodyClass: 'Coupe',
      VehicleType: 'PASSENGER CAR',
      FuelTypePrimary: 'Gasoline',
      EngineModel: 'J30A4',
      EngineCylinders: '6',
      DisplacementL: '3.0',
      EngineHP: '240',
      TransmissionStyle: 'Automatic',
      DriveType: 'FWD/Front-Wheel Drive',
      Manufacturer: 'AMERICAN HONDA MOTOR CO., INC.',
      PlantCity: 'MARYSVILLE',
      PlantCountry: 'UNITED STATES',
      Doors: '2',
      Seats: '5',
      SeatBeltsAll: 'Manual',
      AirBagLocFront: '1st Row (Driver and Passenger)',
      TPMS: 'Direct',
      VehicleDescriptor: '1HGCM826*3A',
      ErrorCode: '0',
    });

    expect(vehicle).toMatchObject({
      vin: '1HGCM82633A004352',
      make: 'HONDA',
      model: 'Accord',
      modelYear: 2003,
      series: 'EX-L',
      trim: 'EX',
      bodyClass: 'Coupe',
      vehicleType: 'PASSENGER CAR',
      fuelType: 'Gasoline',
      engine: 'J30A4 / 6 cyl / 3.0 / 240 hp',
      transmission: 'Automatic',
      driveType: 'FWD/Front-Wheel Drive',
      manufacturer: 'AMERICAN HONDA MOTOR CO., INC.',
      plantCity: 'MARYSVILLE',
      plantCountry: 'UNITED STATES',
      doors: '2',
      seats: '5',
      seatBelts: 'Manual',
      airbagsFront: '1st Row (Driver and Passenger)',
      tpms: 'Direct',
      vehicleDescriptor: '1HGCM826*3A',
      decodeWarning: null,
    });
  });

  it('keeps partial decode warnings when NHTSA cannot identify all fields', () => {
    const vehicle = mapVinDecodeResult({
      VIN: 'WBA1R51040V751575',
      Make: 'BMW',
      Manufacturer: 'BMW AG',
      PlantCity: 'LEIPZIG',
      PlantCountry: 'GERMANY',
      VehicleType: 'PASSENGER CAR',
      ErrorCode: '1,11,14,400',
      ErrorText: 'Decoded data may not be accurate.',
      AdditionalErrorText: 'Invalid character(s): 10:0.',
    });

    expect(vehicle).toMatchObject({
      vin: 'WBA1R51040V751575',
      make: 'BMW',
      model: null,
      modelYear: null,
      plantCity: 'LEIPZIG',
      plantCountry: 'GERMANY',
      decodeWarning: 'Invalid character(s): 10:0.',
    });
  });

  it('maps Auto.dev decode data into vehicle fields', () => {
    const vehicle = mapAutoDevDecodeResult({
      vin: 'WBA1R51040V751575',
      vinValid: true,
      origin: 'Germany',
      type: 'Active',
      make: 'BMW',
      model: '1 Series',
      trim: '118d',
      style: '5 Door Hatchback',
      body: 'Hatchback',
      engine: '2.0L I4 Diesel',
      drive: 'RWD',
      transmission: 'Automatic',
      vehicle: {
        year: 2020,
        manufacturer: 'BMW AG',
      },
    });

    expect(vehicle).toMatchObject({
      vin: 'WBA1R51040V751575',
      make: 'BMW',
      model: '1 Series',
      modelYear: 2020,
      series: '5 Door Hatchback',
      trim: '118d',
      bodyClass: 'Hatchback',
      vehicleType: 'Active',
      engine: '2.0L I4 Diesel',
      driveType: 'RWD',
      transmission: 'Automatic',
      manufacturer: 'BMW AG',
      plantCountry: 'Germany',
    });
  });

  it('decodes VIN data through the NHTSA API', async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          Results: [
            {
              VIN: '1HGCM82633A004352',
              Make: 'HONDA',
              Model: 'Accord',
              ModelYear: '2003',
              ErrorCode: '0',
            },
          ],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const vehicle = await decodeVin('1hg cm82633a004352');

    expect(vehicle).toMatchObject({
      vin: '1HGCM82633A004352',
      make: 'HONDA',
      model: 'Accord',
      modelYear: 2003,
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/1HGCM82633A004352?format=json',
    );
  });

  it('rejects invalid VIN values before calling the API', async () => {
    globalThis.fetch = mock(
      async () => new Response('{}'),
    ) as unknown as typeof fetch;

    await expect(decodeVin('INVALID')).rejects.toThrow(VinDecodeError);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
