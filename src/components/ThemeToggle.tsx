'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options: { value: 'light' | 'dark' | 'system'; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="w-4 h-4" />, label: 'Clar' },
    { value: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Fosc' },
    { value: 'system', icon: <Monitor className="w-4 h-4" />, label: 'Sistema' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200 dark:bg-slate-800">
      {options.map((option) => (
        <motion.button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            theme === option.value
              ? 'text-white'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          whileTap={{ scale: 0.95 }}
        >
          {theme === option.value && (
            <motion.div
              layoutId="theme-indicator"
              className="absolute inset-0 bg-blue-500 rounded-full"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </span>
        </motion.button>
      ))}
    </div>
  );
}
