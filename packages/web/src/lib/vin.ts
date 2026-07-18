export type DecodedVehicle = {
  provider: 'auto_dev' | 'nhtsa';
  vin: string;
  make: string | null;
  model: string | null;
  modelYear: number | null;
  series: string | null;
  trim: string | null;
  bodyClass: string | null;
  vehicleType: string | null;
  fuelType: string | null;
  engine: string | null;
  transmission: string | null;
  driveType: string | null;
  manufacturer: string | null;
  plantCity: string | null;
  plantCountry: string | null;
  doors: string | null;
  seats: string | null;
  seatBelts: string | null;
  airbagsFront: string | null;
  tpms: string | null;
  vehicleDescriptor: string | null;
  suggestedVin: string | null;
  decodeWarning: string | null;
  raw: Record<string, string | null>;
};

type NhtsaVinResult = {
  VIN?: string;
  Make?: string;
  Model?: string;
  ModelYear?: string;
  Series?: string;
  Series2?: string;
  Trim?: string;
  BodyClass?: string;
  VehicleType?: string;
  FuelTypePrimary?: string;
  EngineModel?: string;
  EngineCylinders?: string;
  DisplacementL?: string;
  EngineHP?: string;
  EngineKW?: string;
  TransmissionStyle?: string;
  DriveType?: string;
  Manufacturer?: string;
  PlantCity?: string;
  PlantCountry?: string;
  Doors?: string;
  Seats?: string;
  SeatBeltsAll?: string;
  AirBagLocFront?: string;
  TPMS?: string;
  VehicleDescriptor?: string;
  SuggestedVIN?: string;
  ErrorCode?: string;
  ErrorText?: string;
  AdditionalErrorText?: string;
};

type NhtsaVinResponse = {
  Results?: NhtsaVinResult[];
};

type AutoDevVinResponse = {
  vin?: string;
  vinValid?: boolean;
  origin?: string;
  type?: string;
  make?: string;
  model?: string;
  trim?: string;
  style?: string;
  body?: string;
  engine?: string;
  drive?: string;
  transmission?: string;
  vehicle?: {
    vin?: string;
    year?: number;
    make?: string;
    model?: string;
    manufacturer?: string;
  };
  ambiguous?: boolean;
};

type ErrorResponse = {
  success?: false;
  message?: string;
};

export class VinDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VinDecodeError';
  }
}

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

function clean(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

function cleanYear(value?: string | null) {
  const year = Number.parseInt(value ?? '', 10);
  return Number.isFinite(year) ? year : null;
}

export function normalizeVin(value: string) {
  return value.toUpperCase().replace(/[\s-]/g, '');
}

export function isValidVin(value: string) {
  return VIN_PATTERN.test(normalizeVin(value));
}

export function mapAutoDevDecodeResult(
  result: AutoDevVinResponse,
): DecodedVehicle {
  const vin = normalizeVin(result.vin ?? result.vehicle?.vin ?? '');
  return {
    provider: 'auto_dev',
    vin,
    make: clean(result.make) ?? clean(result.vehicle?.make),
    model: clean(result.model) ?? clean(result.vehicle?.model),
    modelYear: result.vehicle?.year ?? null,
    series: clean(result.style),
    trim: clean(result.trim),
    bodyClass: clean(result.body),
    vehicleType: clean(result.type),
    fuelType: null,
    engine: clean(result.engine),
    transmission: clean(result.transmission),
    driveType: clean(result.drive),
    manufacturer: clean(result.vehicle?.manufacturer),
    plantCity: null,
    plantCountry: clean(result.origin),
    doors: null,
    seats: null,
    seatBelts: null,
    airbagsFront: null,
    tpms: null,
    vehicleDescriptor: null,
    suggestedVin: null,
    decodeWarning: result.ambiguous
      ? 'Auto.dev je vratio vise mogucih podudaranja za ovaj VIN.'
      : null,
    raw: Object.fromEntries(
      Object.entries(result).map(([key, value]) => [
        key,
        typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : clean(String(value ?? '')),
      ]),
    ),
  };
}

export function mapVinDecodeResult(result: NhtsaVinResult): DecodedVehicle {
  const displacement = clean(result.DisplacementL);
  const cylinders = clean(result.EngineCylinders);
  const engineModel = clean(result.EngineModel);
  const hp = clean(result.EngineHP);
  const kw = clean(result.EngineKW);
  const engine = [
    engineModel,
    cylinders ? `${cylinders} cyl` : null,
    displacement,
    hp ? `${hp} hp` : null,
    kw ? `${kw} kW` : null,
  ]
    .filter(Boolean)
    .join(' / ');
  const errorCode = clean(result.ErrorCode);
  const warning =
    errorCode && errorCode !== '0'
      ? clean(result.AdditionalErrorText) || clean(result.ErrorText)
      : null;

  return {
    provider: 'nhtsa',
    vin: normalizeVin(result.VIN ?? ''),
    make: clean(result.Make),
    model: clean(result.Model),
    modelYear: cleanYear(result.ModelYear),
    series: clean([result.Series, result.Series2].filter(clean).join(' / ')),
    trim: clean(result.Trim),
    bodyClass: clean(result.BodyClass),
    vehicleType: clean(result.VehicleType),
    fuelType: clean(result.FuelTypePrimary),
    engine: engine || null,
    transmission: clean(result.TransmissionStyle),
    driveType: clean(result.DriveType),
    manufacturer: clean(result.Manufacturer),
    plantCity: clean(result.PlantCity),
    plantCountry: clean(result.PlantCountry),
    doors: clean(result.Doors),
    seats: clean(result.Seats),
    seatBelts: clean(result.SeatBeltsAll),
    airbagsFront: clean(result.AirBagLocFront),
    tpms: clean(result.TPMS),
    vehicleDescriptor: clean(result.VehicleDescriptor),
    suggestedVin: clean(result.SuggestedVIN),
    decodeWarning: warning,
    raw: Object.fromEntries(
      Object.entries(result).map(([key, value]) => [key, clean(value)]),
    ),
  };
}

async function decodeVinWithBackend(
  vin: string,
): Promise<DecodedVehicle | null> {
  const baseUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '');
  if (!baseUrl) return null;

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/vehicles/decode-vin/${encodeURIComponent(vin)}`,
    );
  } catch {
    return null;
  }

  if (response.status === 503) return null;

  const data = (await response.json()) as AutoDevVinResponse | ErrorResponse;
  if (!response.ok) {
    throw new VinDecodeError(
      'message' in data && data.message
        ? data.message
        : 'Auto.dev nije uspio dekodirati ovaj VIN.',
    );
  }

  return mapAutoDevDecodeResult(data as AutoDevVinResponse);
}

export async function decodeVin(value: string): Promise<DecodedVehicle> {
  const vin = normalizeVin(value);
  if (!VIN_PATTERN.test(vin)) {
    throw new VinDecodeError(
      'VIN mora imati 17 znakova i ne smije sadrzavati I, O ili Q.',
    );
  }

  const backendVehicle = await decodeVinWithBackend(vin);
  if (backendVehicle) return backendVehicle;

  const response = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(
      vin,
    )}?format=json`,
  );

  if (!response.ok) {
    throw new VinDecodeError('VIN servis trenutno nije dostupan.');
  }

  const data = (await response.json()) as NhtsaVinResponse;
  const result = data.Results?.[0];
  if (!result) {
    throw new VinDecodeError('Nisu pronadjeni podaci za ovaj VIN.');
  }

  const decoded = mapVinDecodeResult({ ...result, VIN: vin });
  if (!decoded.make && !decoded.model && result.ErrorText) {
    throw new VinDecodeError(result.ErrorText);
  }

  return decoded;
}
