import { useState } from 'react';

// Croatian emergency numbers (app is hr-HR). 112 is the universal EU line.
const EMERGENCY = [
  { label: 'Hitne službe', number: '112', primary: true },
  { label: 'Policija', number: '192' },
  { label: 'Hitna pomoć', number: '194' },
  { label: 'Vatrogasci', number: '193' },
];

type ShareState = 'idle' | 'sharing' | 'shared' | 'copied' | 'error';

// Safety panel during an intervention (#30): share your live location with a
// contact + one-tap access to emergency numbers.
export function SosSheet({ onClose }: { onClose: () => void }) {
  const [share, setShare] = useState<ShareState>('idle');

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setShare('error');
      return;
    }
    setShare('sharing');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const url = `https://maps.google.com/?q=${lat},${lng}`;
        const text = `Moja lokacija (RoadMate): ${url}`;
        try {
          if (navigator.share) {
            await navigator.share({ title: 'Moja lokacija', text, url });
            setShare('shared');
          } else {
            await navigator.clipboard.writeText(text);
            setShare('copied');
          }
        } catch {
          // User cancelled the share sheet — leave it idle.
          setShare('idle');
        }
      },
      () => setShare('error'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Zatvori"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md animate-fade-up rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-slate-900 text-xl dark:text-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              </span>
              Hitna pomoć
            </h2>
            <p className="mt-1 text-slate-500 text-sm dark:text-slate-400">
              Podijeli lokaciju i pozovi pomoć jednim dodirom.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zatvori"
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Podijeli lokaciju */}
        <button
          type="button"
          onClick={shareLocation}
          disabled={share === 'sharing'}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-sm text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" x2="12" y1="2" y2="15" />
          </svg>
          {share === 'sharing'
            ? 'Dohvaćam lokaciju…'
            : 'Podijeli moju lokaciju'}
        </button>
        {share === 'shared' && (
          <p className="mt-2 text-center text-green-600 text-sm dark:text-green-400">
            Lokacija podijeljena.
          </p>
        )}
        {share === 'copied' && (
          <p className="mt-2 text-center text-green-600 text-sm dark:text-green-400">
            Link kopiran — zalijepi ga kontaktu.
          </p>
        )}
        {share === 'error' && (
          <p className="mt-2 text-center text-red-600 text-sm">
            Ne mogu dohvatiti lokaciju. Dozvoli pristup lokaciji.
          </p>
        )}

        {/* Hitni brojevi */}
        <div className="mt-6">
          <div className="mb-2 font-medium text-slate-500 text-xs dark:text-slate-400">
            HITNI BROJEVI
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EMERGENCY.map((e) => (
              <a
                key={e.number}
                href={`tel:${e.number}`}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 font-semibold transition ${
                  e.primary
                    ? 'border-red-500 bg-red-500 text-white hover:bg-red-600'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-sm">{e.label}</span>
                <span className={e.primary ? 'text-lg' : 'text-brand text-lg'}>
                  {e.number}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
