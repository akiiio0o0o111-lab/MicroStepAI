/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lavender: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#e0e7ff',
          300: '#c7d2fe',
        },
        // Нічна тема: майже чорний фон і темно-сірі поверхні.
        night: {
          950: '#04060a',
          900: '#090e15',
          850: '#0d141c',
          800: '#121a24',
          700: '#1b2632',
          600: '#27364a',
        },
        // Приємний блакитний текст для нічної теми.
        ice: {
          50: '#f3f8ff',
          100: '#e2eeff',
          200: '#c9e0ff',
          300: '#a9ccff',
          400: '#7fb2f0',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
