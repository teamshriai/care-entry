import { useCallback, useEffect, useState } from 'react';

// Keep in sync with the pre-paint script in index.html / demo.html, which
// applies the saved theme before first paint so there is no flash.
const THEME_KEY = 'shri-theme-v3';

function readStored(): boolean {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark';
  } catch {
    return false; // storage unavailable — light is the correct default
  }
}

/**
 * Light by default; only an explicit, saved 'dark' choice switches it. The OS
 * colour-scheme preference is deliberately not consulted (same as Front Office).
 */
export function useTheme() {
  const [dark, setDark] = useState(readStored);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14181F' : '#E8EDF4');
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      /* storage unavailable — the theme still applies for this session */
    }
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);
  return { dark, toggle };
}
