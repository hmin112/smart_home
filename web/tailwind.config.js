/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'apple-bg': '#F5F5F7',
      },
      borderRadius: {
        'apple': '22px',
      }
    },
  },
  plugins: [],
}