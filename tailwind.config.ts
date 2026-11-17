import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcd2ff",
          300: "#8eb4ff",
          400: "#598dff",
          500: "#3366ff",
          600: "#1f47f5",
          700: "#1736e2",
          800: "#192eb6",
          900: "#1a2f8f",
          950: "#141d57",
        },
        ink: {
          50: "#f6f7f9",
          100: "#ecedf0",
          200: "#d5d8df",
          300: "#b0b5c2",
          400: "#858d9e",
          500: "#666f83",
          600: "#51586b",
          700: "#434957",
          800: "#3b404b",
          900: "#343841",
          950: "#1e222a",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        "card-hover": "0 4px 12px rgba(16,24,40,0.10), 0 2px 4px rgba(16,24,40,0.06)",
        pop: "0 12px 32px rgba(16,24,40,0.14), 0 4px 8px rgba(16,24,40,0.06)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 1px 1px, rgba(16,24,40,0.06) 1px, transparent 0)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        fadeIn: "fade-up 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
