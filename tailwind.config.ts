import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: "#0D0C0A",
        ink: "#EDE8DC",
        accent: "#D0554A",
        muted: "#9A9484",
        surface: "#16140F",
        card: "#1C1A14",
        rule: "#332E22",
        teal: "#4FB89A",
        amber: "#DCA04A",
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        body: ["Source Serif 4", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
