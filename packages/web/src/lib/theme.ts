import { create } from 'zustand';

export type ThemePref = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'roadmate-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

const stored = (): ThemePref => {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'auto';
};

const isDark = (pref: ThemePref) =>
  pref === 'dark' || (pref === 'auto' && media.matches);

const applyClass = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark);
};

interface ThemeState {
  pref: ThemePref;
  dark: boolean;
  setPref: (p: ThemePref) => void;
  init: () => void;
}

export const useTheme = create<ThemeState>((set) => ({
  pref: stored(),
  dark: isDark(stored()),
  setPref: (p) => {
    localStorage.setItem(STORAGE_KEY, p);
    const dark = isDark(p);
    applyClass(dark);
    set({ pref: p, dark });
  },
  init: () => {
    const pref = stored();
    const dark = isDark(pref);
    applyClass(dark);
    set({ pref, dark });
    // Follow the OS scheme while on 'auto'.
    media.addEventListener('change', () => {
      if (stored() !== 'auto') return;
      const dark = media.matches;
      applyClass(dark);
      set({ dark });
    });
  },
}));
