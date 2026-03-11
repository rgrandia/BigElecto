'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme') as Theme;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    localStorage.setItem('theme', theme);
    
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const newResolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    
    setResolvedTheme(newResolved);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newResolved);
  }, [theme, mounted]);

  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
