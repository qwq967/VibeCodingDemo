import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        warm: {
          50: "#faf9f7",
          100: "#f5f3ef",
          200: "#e8e4dc",
          300: "#d4cfc4",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
      fontSize: {
        base: "15px",
      },
      lineHeight: {
        relaxed: "1.8",
      },
      borderRadius: {
        bubble: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
