import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-3 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-blue-600 group"
      aria-label={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
      title={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
    >
      <div className="relative">
        {theme === 'light' ? (
          <Moon className="h-5 w-5 text-white group-hover:text-blue-100 transition-colors duration-300" />
        ) : (
          <Sun className="h-5 w-5 text-yellow-300 group-hover:text-yellow-200 transition-colors duration-300" />
        )}
      </div>
    </button>
  );
};