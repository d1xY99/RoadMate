export type Emergency = { label: string; number: string; primary?: boolean };

// 112 is the universal EU / GSM emergency line — safe fallback everywhere.
const UNIVERSAL: Emergency[] = [
  { label: 'Hitne službe', number: '112', primary: true },
];

// Country (ISO-3166 alpha-2) → local emergency numbers. Extend as needed;
// anything not listed falls back to 112.
const BY_COUNTRY: Record<string, Emergency[]> = {
  HR: [
    { label: 'Hitne službe', number: '112', primary: true },
    { label: 'Policija', number: '192' },
    { label: 'Hitna pomoć', number: '194' },
    { label: 'Vatrogasci', number: '193' },
  ],
  BA: [
    { label: 'Hitne službe', number: '112', primary: true },
    { label: 'Policija', number: '122' },
    { label: 'Hitna pomoć', number: '124' },
    { label: 'Vatrogasci', number: '123' },
  ],
  RS: [
    { label: 'Hitne službe', number: '112', primary: true },
    { label: 'Policija', number: '192' },
    { label: 'Hitna pomoć', number: '194' },
    { label: 'Vatrogasci', number: '193' },
  ],
  ME: [
    { label: 'Hitne službe', number: '112', primary: true },
    { label: 'Policija', number: '122' },
    { label: 'Hitna pomoć', number: '124' },
    { label: 'Vatrogasci', number: '123' },
  ],
  MK: [
    { label: 'Hitne službe', number: '112', primary: true },
    { label: 'Policija', number: '192' },
    { label: 'Hitna pomoć', number: '194' },
    { label: 'Vatrogasci', number: '193' },
  ],
  SI: [
    { label: 'Hitne službe', number: '112', primary: true },
    { label: 'Policija', number: '113' },
  ],
  AT: [
    { label: 'Hitne službe', number: '112', primary: true },
    { label: 'Policija', number: '133' },
    { label: 'Hitna pomoć', number: '144' },
    { label: 'Vatrogasci', number: '122' },
  ],
  DE: [
    { label: 'Hitna / vatrogasci', number: '112', primary: true },
    { label: 'Policija', number: '110' },
  ],
  IT: [{ label: 'Hitne službe', number: '112', primary: true }],
  US: [{ label: 'Hitne službe', number: '911', primary: true }],
  GB: [
    { label: 'Hitne službe', number: '999', primary: true },
    { label: 'Alternativni', number: '112' },
  ],
};

export const emergencyFor = (countryCode?: string): Emergency[] =>
  (countryCode && BY_COUNTRY[countryCode.toUpperCase()]) || UNIVERSAL;

// Reverse-geocode coordinates to an ISO country code. BigDataCloud's
// reverse-geocode-client endpoint is free, keyless and CORS-enabled.
export const countryFromCoords = async (
  lat: number,
  lng: number,
): Promise<string | undefined> => {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as { countryCode?: string };
    return data.countryCode || undefined;
  } catch {
    return undefined;
  }
};
