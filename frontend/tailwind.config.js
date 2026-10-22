/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        markaz: {
          50: '#eef7fd',
          100: '#d7ecfa',
          200: '#b5ddf7',
          300: '#81c5f2',
          400: '#46a6e9',
          500: '#1d89db',
          600: '#0f6cb8',
          700: '#0c629e', // Original Markaz Primary Blue
          800: '#0e4a78',
          900: '#113e63',
          950: '#0b2742',
        },
        kerala: {
          box: '#CCE1F2', // Original District, Zone, Circle background
          unit: '#FBF7D5'  // Original Unit background
        }
      },
      fontFamily: {
        sans: ['"Public Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif']
      }
    },
  },
  plugins: [],
}
