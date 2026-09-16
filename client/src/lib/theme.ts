export type ThemeMode = 'telemetry' | 'pear' | 'heritage';

const STORAGE_KEY = 'cricket_auction_theme';

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'telemetry';
  const urlParam = new URLSearchParams(window.location.search).get('theme');
  if (urlParam === 'telemetry' || urlParam === 'pear' || urlParam === 'heritage') {
    return urlParam as ThemeMode;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'telemetry' || stored === 'pear' || stored === 'heritage') {
    return stored as ThemeMode;
  }
  return 'telemetry';
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
