import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const FloatingThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="fixed bottom-6 right-6 z-50 group">
      <button
        onClick={toggleTheme}
        className={`
          relative p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 
          focus:outline-none focus:ring-4 focus:ring-opacity-50
          ${theme === 'dark' ? 'animate-pulse-slow' : ''}
        `}
        style={{
          background: theme === 'light' 
            ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
            : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          boxShadow: theme === 'light'
            ? '0 8px 32px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            : '0 8px 32px rgba(251, 191, 36, 0.4), 0 0 0 1px rgba(251, 191, 36, 0.2)'
        }}
        aria-label={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
        title={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
      >
        <div className="relative flex items-center justify-center">
          {theme === 'light' ? (
            <Moon 
              className="h-6 w-6 text-white transition-all duration-300 group-hover:rotate-12 drop-shadow-sm" 
            />
          ) : (
            <Sun 
              className="h-6 w-6 text-white transition-all duration-300 group-hover:rotate-180 drop-shadow-sm" 
            />
          )}
        </div>
        
        {/* Ripple effect on hover */}
        <div 
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)'
          }}
        />
      </button>
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-lg">
        {theme === 'light' ? '🌙 Modo escuro' : '☀️ Modo claro'}
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-white"></div>
      </div>
    </div>
  );
};
