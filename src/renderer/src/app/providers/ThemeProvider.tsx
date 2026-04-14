import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface ThemeContextValue {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = 'insurance-helper:theme';

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return false;
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark') return true;
  if (saved === 'light') return false;

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem(STORAGE_KEY, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const value = useMemo<ThemeContextValue>(() => ({
    isDarkMode,
    toggleTheme: () => setIsDarkMode((prev) => !prev),
    setDarkMode: setIsDarkMode
  }), [isDarkMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}
