import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // The Asphalt Backgrounds
        slate: {
          850: "#172033",
          900: "#0F172A",
          950: "#020617",
        },
        // The Warning / Action Color (Amber)
        amber: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"], // Digital dashboard font
        sans: ['"Inter"', "sans-serif"], // UI font
      },
    },
  },
  plugins: [],
};
export default config;
