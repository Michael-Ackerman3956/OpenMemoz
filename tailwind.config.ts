import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--color-paper, 13 12 10) / <alpha-value>)",
        ink: "rgb(var(--color-ink, 237 232 220) / <alpha-value>)",
        accent: "rgb(var(--color-accent, 208 85 74) / <alpha-value>)",
        muted: "rgb(var(--color-muted, 154 148 132) / <alpha-value>)",
        surface: "rgb(var(--color-surface, 22 20 15) / <alpha-value>)",
        card: "rgb(var(--color-card, 28 26 20) / <alpha-value>)",
        rule: "rgb(var(--color-rule, 51 46 34) / <alpha-value>)",
        teal: "rgb(var(--color-teal, 79 184 154) / <alpha-value>)",
        amber: "rgb(var(--color-amber, 220 160 74) / <alpha-value>)",
      },
      fontFamily: {
        serif: ["var(--font-serif-override, 'Playfair Display')", "Georgia", "serif"],
        body: ["var(--font-body-override, 'Source Serif 4')", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
