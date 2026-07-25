// Digitalne vinjete za putnička vozila (do 3.5t) — zvanični shopovi.
// Cijene i linkovi provjereni 25.07.2026. na zvaničnim stranicama.
// ASFINAG (AT) ima deep-link po trajanju; DARS (SI) i eDalnice (CZ) su
// SPA shopovi bez linkova po trajanju, pa svi linkovi vode na početak
// kupovine gdje se trajanje bira ručno.

export type VignetteOption = {
  duration: string;
  price: string;
  url: string;
};

export type VignetteCountry = {
  code: 'at' | 'si' | 'cz';
  name: string;
  flag: string;
  shop: string;
  // true = link otvara tačno taj proizvod (trajanje već odabrano)
  deepLinks: boolean;
  options: VignetteOption[];
};

const ASFINAG = 'https://shop.asfinag.at/en/toll-products/digital-vignette';
const DARS = 'https://evinjeta.dars.si/selfcare/en';
const EDALNICE = 'https://edalnice.gov.cz/en/simple-purchase';

export const VIGNETTE_PRICES_VERIFIED = 'juli 2026.';

export const VIGNETTE_COUNTRIES: VignetteCountry[] = [
  {
    code: 'at',
    name: 'Austrija',
    flag: '🇦🇹',
    shop: 'ASFINAG',
    deepLinks: true,
    options: [
      {
        duration: '1 dan',
        price: '9,60 €',
        url: `${ASFINAG}/1-day-vignette-car/`,
      },
      {
        duration: '10 dana',
        price: '12,80 €',
        url: `${ASFINAG}/10-day-vignette-car/`,
      },
      {
        duration: '2 mjeseca',
        price: '32,00 €',
        url: `${ASFINAG}/2-month-vignette-car/`,
      },
      {
        duration: 'Godišnja',
        price: '106,80 €',
        url: `${ASFINAG}/annual-vignette-car/`,
      },
    ],
  },
  {
    code: 'si',
    name: 'Slovenija',
    flag: '🇸🇮',
    shop: 'DARS e-vinjeta',
    deepLinks: false,
    options: [
      { duration: '7 dana', price: '16,00 €', url: DARS },
      { duration: 'Mjesečna', price: '32,00 €', url: DARS },
      { duration: 'Godišnja', price: '117,50 €', url: DARS },
    ],
  },
  {
    code: 'cz',
    name: 'Češka',
    flag: '🇨🇿',
    shop: 'eDalnice',
    deepLinks: false,
    options: [
      { duration: '1 dan', price: '230 CZK', url: EDALNICE },
      { duration: '10 dana', price: '300 CZK', url: EDALNICE },
      { duration: '30 dana', price: '480 CZK', url: EDALNICE },
      { duration: 'Godišnja', price: '2.570 CZK', url: EDALNICE },
    ],
  },
];
