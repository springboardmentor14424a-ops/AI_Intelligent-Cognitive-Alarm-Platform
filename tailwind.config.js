/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#F7F7FC",
          100: "#EFEFFA",
          900: "#100B24",
          950: "#0A0716",
        },
        indigo: {
          50: "#EEF0FF",
          100: "#E0E3FF",
          200: "#C3C8FF",
          300: "#9CA3FF",
          400: "#7B7FFF",
          500: "#5B5CF6",
          600: "#4640E0",
          700: "#3830B8",
          800: "#2E2790",
          900: "#241F6E",
        },
        violet: {
          50: "#F6EEFF",
          100: "#EBDBFF",
          400: "#B27BFF",
          500: "#9B4DFF",
          600: "#8324F0",
          700: "#6B1BC7",
        },
        sky: {
          400: "#4FCBFF",
          500: "#22B2F2",
        },
      },
      fontFamily: {
        display: ["'Sora'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        aurora:
          "radial-gradient(60% 60% at 20% 20%, rgba(155,77,255,0.20) 0%, rgba(155,77,255,0) 60%), radial-gradient(50% 50% at 85% 15%, rgba(79,203,255,0.18) 0%, rgba(79,203,255,0) 60%), radial-gradient(70% 70% at 50% 100%, rgba(91,92,246,0.16) 0%, rgba(91,92,246,0) 60%)",
        "brand-gradient": "linear-gradient(135deg, #5B5CF6 0%, #8324F0 100%)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 11, 36, 0.04), 0 8px 24px -8px rgba(46, 39, 144, 0.12)",
        glow: "0 0 0 1px rgba(155,77,255,0.15), 0 12px 32px -8px rgba(91,92,246,0.35)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        floatSlow: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 2.4s cubic-bezier(0.4,0,0.6,1) infinite",
        floatSlow: "floatSlow 6s ease-in-out infinite",
        fadeUp: "fadeUp 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
