import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Verificar se há preferência salva no localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }
    // Padrão: claro (independente da preferência do sistema)
    return 'light';
  });

  useEffect(() => {
    // Persistir preferência
    try { localStorage.setItem('theme', theme); } catch {}

    // Aplicar classe no html para o CSS
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    // Notificar outras instâncias do hook na mesma página
    try {
      window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }));
    } catch {}
  }, [theme]);

  // Sincronizar múltiplas instâncias do hook (mesma aba)
  useEffect(() => {
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as Theme | undefined;
      if (detail && detail !== theme) {
        setTheme(detail);
      }
    };
    window.addEventListener('theme-change', onThemeChange as EventListener);
    return () => window.removeEventListener('theme-change', onThemeChange as EventListener);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  return { theme, toggleTheme };
};