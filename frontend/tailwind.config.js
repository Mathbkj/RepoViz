/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        hand: ['"Caveat"', 'cursive'],
      },
      colors: {
        canvas: '#fafaf8',
        ink: '#1a1a2e',
      },
    },
  },
  plugins: [],
};
