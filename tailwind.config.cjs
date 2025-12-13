module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/**/*.{html,js,ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
          950: '#0f172a',
        }
      },
      boxShadow: {
        glass: '0 20px 45px rgba(15, 23, 42, 0.45)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle at top, rgba(37, 99, 235, 0.25), rgba(15, 23, 42, 0.9))'
      }
    }
  },
  plugins: []
};
