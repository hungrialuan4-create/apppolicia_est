/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#060a13',
        navy: { 900: '#0a1020', 800: '#0e1729', 700: '#16223a', 600: '#1f2f50' },
        brand: { DEFAULT: '#3b82f6', soft: '#60a5fa', deep: '#1d4ed8' },
        gold: { DEFAULT: '#d4af37', soft: '#e6c968' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: { fadeUp: 'fadeUp .35s ease-out both' },
    },
  },
  plugins: [],
}
