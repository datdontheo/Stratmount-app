import { create } from 'zustand';

const saved = localStorage.getItem('sm_theme') || 'dark';
document.documentElement.setAttribute('data-theme', saved);

const useThemeStore = create((set) => ({
  theme: saved,
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('sm_theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),
}));

export default useThemeStore;
