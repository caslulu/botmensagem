module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/**/*.{html,js,ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Segoe UI Variable', 'Avenir Next', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Iowan Old Style', 'Georgia', 'serif']
      },
      colors: {
        brand: {
          50: '#eef9f7',
          100: '#d6eee9',
          200: '#b0ddd5',
          300: '#82c5b9',
          400: '#53a697',
          500: '#2d8478',
          600: '#246b62',
          700: '#205650',
          800: '#1d4642',
          900: '#1a3a37',
          950: '#0d2120',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },
      boxShadow: {
        glass: '0 24px 60px rgba(15, 23, 42, 0.12)',
        'glass-sm': '0 12px 30px rgba(15, 23, 42, 0.08)',
        card: '0 18px 45px rgba(15, 23, 42, 0.08)',
        'card-hover': '0 28px 60px rgba(15, 23, 42, 0.14)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle at top, rgba(45, 132, 120, 0.16), transparent 42%)',
        'gradient-subtle': 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.76))'
      }
    }
  },
  plugins: []
};
