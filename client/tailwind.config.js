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
        // UCLA Primary
        'ucla-blue': '#2774AE',
        'ucla-gold': '#FFD100',
        // UCLA Blue Tones
        'ucla-darkest-blue': '#003B5C',
        'ucla-darker-blue': '#005587',
        'ucla-dark-blue': '#005587',
        'ucla-lighter-blue': '#8BB8E8',
        'ucla-lightest-blue': '#DAEBFE',
        // UCLA Gold Tones
        'ucla-darkest-gold': '#FFB81C',
        'ucla-darker-gold': '#FFC72C',
      },
    },
  },
  plugins: [],
}
