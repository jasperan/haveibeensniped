/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx",
  ],
  theme: {
    extend: {
      colors: {
        indigo: { 50:'#f6f2e6',100:'#eee5c9',200:'#ddd0a8',300:'#d5c18c',400:'#cbb77d',500:'#ad9557',600:'#827039',700:'#62542e',800:'#423c28',900:'#2e2d21',950:'#1b2118' },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem', letterSpacing: '0.15em' }],
      },
    },
  },
  plugins: [],
}
