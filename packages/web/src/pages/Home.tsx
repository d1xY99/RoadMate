import { useState } from 'react';
import { MapView } from '@/components/MapView';

export function Home() {
  const [helping, setHelping] = useState(false);

  return (
    <div className="relative h-full w-full">
      <MapView />

      {/* Top bar */}
      <header className="absolute left-0 right-0 top-0 flex items-center justify-between bg-white/90 px-4 py-3 shadow backdrop-blur">
        <span className="text-lg font-bold text-brand">🚗 RoadMate</span>
        <label className="flex items-center gap-2 text-sm">
          <span>Dostupan za pomoć</span>
          <input
            type="checkbox"
            checked={helping}
            onChange={(e) => setHelping(e.target.checked)}
            className="h-5 w-5 accent-brand"
          />
        </label>
      </header>

      {/* Bottom action */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <button
          type="button"
          className="w-full rounded-xl bg-brand py-4 text-center text-lg font-semibold text-white shadow-lg active:bg-brand-dark"
          onClick={() => alert('TODO: otvori formu za zahtjev za pomoć')}
        >
          🆘 Trebam pomoć
        </button>
      </div>
    </div>
  );
}
