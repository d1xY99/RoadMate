import { create } from 'zustand';

export type ThemePref = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'roadmate-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

const stored = (): ThemePref => {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'auto';
};

const apply = (pref: ThemePref) => {
  const dark = pref === 'dark' || (pref === 'auto' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
};

interface ThemeState {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  init: () => void;
}

export const useTheme = create<ThemeState>((set) => ({
  pref: stored(),
  setPref: (p) => {
    localStorage.setItem(STORAGE_KEY, p);
    apply(p);
    set({ pref: p });
  },
  init: () => {
    const pref = stored();
    apply(pref);
    // Follow the OS scheme while on 'auto'.
    media.addEventListener('change', () => {
      if (stored() === 'auto') apply('auto');
    });
    set({ pref });
  },
}));
