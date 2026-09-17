export type ThemeMode = 'cobalt' | 'telemetry' | 'pear';

const STORAGE_KEY = 'cricket_auction_theme';

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'cobalt';
  const urlParam = new URLSearchParams(window.location.search).get('theme');
  if (urlParam === 'cobalt' || urlParam === 'telemetry' || urlParam === 'pear') {
    return urlParam as ThemeMode;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'cobalt' || stored === 'telemetry' || stored === 'pear') {
    return stored as ThemeMode;
  }
  return 'cobalt';
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}
