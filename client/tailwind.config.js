/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── UCLA Primary ──────────────────────────────────────────────
        'ucla-blue':  '#2774AE',   // PANTONE 2383C / RGB 39 116 174
        'ucla-gold':  '#FFD100',   // PANTONE 109C  / RGB 255 209 0

        // ── UCLA Secondary Blues ──────────────────────────────────────
        'ucla-darkest-blue':  '#003B5C',  // PANTONE 302C
        'ucla-darker-blue':   '#005587',  // PANTONE 7692C
        'ucla-navy':          '#001628',  // Dark-mode surface / sidebar
        'ucla-lighter-blue':  '#8BB8E8',  // PANTONE 278C
        'ucla-lightest-blue': '#DAEBFE',  // PANTONE 2707C

        // ── UCLA Secondary Golds ─────────────────────────────────────
        'ucla-darkest-gold':  '#FFB81C',  // PANTONE 1235C
        'ucla-darker-gold':   '#FFC72C',  // PANTONE 123C

        // ── Semantic aliases (use these in components) ────────────────
        'ucla-blue-hover':    '#005587',  // Darker Blue — hover state on ucla-blue
        'ucla-blue-active':   '#003B5C',  // Darkest Blue — pressed/active
        'ucla-gold-hover':    '#FFC72C',  // Darker Gold — hover state on ucla-gold
        'ucla-gold-active':   '#FFB81C',  // Darkest Gold — pressed/active
      },
    },
  },
  plugins: [],
}
