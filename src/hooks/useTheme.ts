import { useState, useEffect } from 'react';

export type Theme = 'system' | 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Track system theme changes
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    
    const listener = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  // Compute the active visual theme (light or dark)
  const isDark = theme === 'system' ? systemIsDark : theme === 'dark';

  // Apply theme to document element and meta tags
  useEffect(() => {
    const root = document.documentElement;
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');

    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark');

    if (theme === 'system') {
      localStorage.removeItem('theme');
      if (metaColorScheme) {
        metaColorScheme.setAttribute('content', 'light dark');
      }
    } else {
      localStorage.setItem('theme', theme);
      root.classList.add('theme-' + theme);
      if (metaColorScheme) {
        metaColorScheme.setAttribute('content', theme);
      }
    }
  }, [theme]);

  // Toggle theme following guide guidelines:
  // 1. System setting (default)
  // 2. The opposite (pinned light or pinned dark)
  const toggleTheme = () => {
    if (theme === 'system') {
      // Toggle to the opposite of the current system theme
      setTheme(systemIsDark ? 'light' : 'dark');
    } else {
      // Toggle back to system
      setTheme('system');
    }
  };

  return {
    theme,
    isDark,
    isSystem: theme === 'system',
    setTheme,
    toggleTheme,
  };
}
