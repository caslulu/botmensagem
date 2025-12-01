module.exports = {
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
          500: '#2563eb',
          600: '#1d4ed8'
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
