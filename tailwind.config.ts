import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        botanical: {
          50: "#f2f8f4",
          100: "#e0efe5",
          200: "#c3dfcd",
          300: "#98c7aa",
          400: "#67a882",
          500: "#458b64",
          600: "#336f4e",
          700: "#2a5940",
          800: "#244735",
          900: "#1e3b2c",
        },
      },
    },
  },
  plugins: [],
};
export default config;
