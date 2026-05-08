import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/ventas/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cb: {
          blue: "#2542C2",
          violet: "#A855F7",
          pink: "#EC4899",
          navy: "#1e3a8a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
