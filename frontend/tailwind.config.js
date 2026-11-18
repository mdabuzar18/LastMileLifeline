/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        safety: {
          blue: "#1e3a8a",
          amber: "#d97706",
          red: "#dc2626",
          green: "#16a34a",
          slate: "#0f172a"
        }
      }
    },
  },
  plugins: [],
}
