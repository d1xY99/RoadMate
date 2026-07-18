import { type ThemePref, useTheme } from '@/lib/theme';

const OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: 'light', label: 'Svijetla', icon: '☀️' },
  { value: 'dark', label: 'Tamna', icon: '🌙' },
  { value: 'auto', label: 'Automatski', icon: '🖥️' },
];

// Theme selector (light / dark / auto = follow OS). Lives on the profile page.
export function ThemePicker() {
  const pref = useTheme((s) => s.pref);
  const setPref = useTheme((s) => s.setPref);

  return (
    <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
        Izgled
      </h2>
      <p className="mt-0.5 text-slate-500 text-sm dark:text-slate-400">
        Odaberi temu aplikacije.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const active = pref === o.value;
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => setPref(o.value)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-4 font-medium text-sm transition ${
                active
                  ? 'border-brand bg-brand/5 text-brand ring-2 ring-brand/20 dark:bg-brand/10'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <span className="text-xl">{o.icon}</span>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
