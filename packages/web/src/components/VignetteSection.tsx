import { VIGNETTE_COUNTRIES, VIGNETTE_PRICES_VERIFIED } from '@/lib/vignette';

// Kupovina digitalnih vinjeta (AT / SI / CZ). Lives on the profile page.
// Klik na trajanje otvara zvanični shop u novom tabu — za Austriju direktno
// na proizvod, za Sloveniju i Češku na početak kupovine (njihovi shopovi
// nemaju linkove po trajanju).
export function VignetteSection() {
  return (
    <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
        Vinjete
      </h2>
      <p className="mt-0.5 text-slate-500 text-sm dark:text-slate-400">
        Kupi digitalnu vinjetu za putničko vozilo u zvaničnom shopu.
      </p>

      <div className="mt-5 space-y-4">
        {VIGNETTE_COUNTRIES.map((country) => (
          <article
            key={country.code}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <span className="text-xl">{country.flag}</span>
                {country.name}
              </h3>
              <span className="text-slate-500 text-xs dark:text-slate-400">
                {country.shop}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {country.options.map((option) => (
                <a
                  key={option.duration}
                  href={option.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center gap-0.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center transition hover:border-brand hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand"
                >
                  <span className="font-semibold text-slate-800 text-sm dark:text-slate-200">
                    {option.duration}
                  </span>
                  <span className="text-slate-500 text-xs dark:text-slate-400">
                    {option.price}
                  </span>
                </a>
              ))}
            </div>

            {!country.deepLinks && (
              <p className="mt-2 text-slate-400 text-xs dark:text-slate-500">
                Shop nema direktan link po trajanju — odabrano trajanje potvrdi
                pri kupovini.
              </p>
            )}
          </article>
        ))}
      </div>

      <p className="mt-4 text-slate-400 text-xs dark:text-slate-500">
        Cijene za putnička vozila do 3.5t, provjereno {VIGNETTE_PRICES_VERIFIED}
      </p>
    </section>
  );
}
