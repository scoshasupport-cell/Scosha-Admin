/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#1a1d23',
          hover: '#252830',
          border: '#2d3139',
          muted: '#8b919a',
        },
        brand: {
          DEFAULT: '#008060',
          hover: '#006e52',
          light: '#e6f5f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
