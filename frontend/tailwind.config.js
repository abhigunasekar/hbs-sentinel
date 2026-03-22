/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        crimson: {
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#f9d0d6',
          300: '#f4a8b4',
          400: '#ed7589',
          500: '#e04464',
          600: '#cc2545',
          700: '#A51C30',
          800: '#8b1a2b',
          900: '#771a28',
          950: '#420a13',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
