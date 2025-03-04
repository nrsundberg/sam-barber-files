const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        marquee: "marquee 30s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
      fontFamily: {
        sans: ['"Share Tech Mono"', "monospace"],
      },
      colors: {
        "sb-banner": "#2f4254",
        "sb-restless": "#984f5a",
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};
