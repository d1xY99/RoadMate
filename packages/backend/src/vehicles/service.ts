export type AutoDevVinResponse = {
  vin?: string;
  vinValid?: boolean;
  wmi?: string;
  origin?: string;
  squishVin?: string;
  checkDigit?: string;
  checksum?: boolean;
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

type AutoDevErrorResponse = {
  status?: number;
  error?: string;
  code?: string;
};

export class VehicleDecodeError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'VehicleDecodeError';
    this.status = status;
  }
}

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export const normalizeVin = (value: string) =>
  value.toUpperCase().replace(/[\s-]/g, '');

export const createVehicleService = (deps: { autoDevApiKey?: string }) => {
  const decodeVin = async (value: string): Promise<AutoDevVinResponse> => {
    const vin = normalizeVin(value);
    if (!VIN_PATTERN.test(vin)) {
      throw new VehicleDecodeError(
        'VIN must be exactly 17 characters and cannot contain I, O, or Q.',
        400,
      );
    }

    if (!deps.autoDevApiKey) {
      throw new VehicleDecodeError('Auto.dev API key is not configured.', 503);
    }

    const response = await fetch(
      `https://api.auto.dev/vin/${encodeURIComponent(vin)}`,
      {
        headers: {
          Authorization: `Bearer ${deps.autoDevApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const data = (await response.json().catch(() => ({}))) as
      | AutoDevVinResponse
      | AutoDevErrorResponse;

    if (!response.ok) {
      const message =
        'error' in data && data.error
          ? data.error
          : 'Auto.dev VIN decode request failed.';
      throw new VehicleDecodeError(message, response.status);
    }

    return data as AutoDevVinResponse;
  };

  return { decodeVin };
};

export type VehicleService = ReturnType<typeof createVehicleService>;
