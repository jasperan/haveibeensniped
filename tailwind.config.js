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
      fontFamily: {
        sans: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // One slate ramp for the desk. Surfaces stay neutral.
        background: "#0c0d10",
        surface: "#121318",
        raised: "#1a1c22",
        line: "#262932",
        ink: "#f0f1f3",
        ink2: "#a2a7b2",
        ink3: "#767b87",
        // The single accent: a selected row, a score above the threshold.
        accent: "#6366f1",
        // The charge: high attention.
        alert: "#e5484d",
        positive: "#4cc38a",
        negative: "#e5484d",
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
}
