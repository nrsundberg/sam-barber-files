const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "sb-banner": "#2f4254",
        "sb-restless": "#984f5a",
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};
