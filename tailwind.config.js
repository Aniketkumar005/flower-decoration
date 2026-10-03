/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* original palette */
        "b-green": "#0b1f1a",
        "b-green2": "#0a201d",
        "b-cream": "#fbf6f2",
        "b-nav": "#f9f4f0",
        "b-card": "#faf5f1",
        "b-wrap": "#f8f4ef",
        "b-gold": "#f2d58f",
        "b-peach": "#f8e5cf",
        "b-text": "#0b1f1a",
        "b-muted": "#8a7f78",
        "b-rose": "#907d72",
        "b-line": "#e9e0d9",

        /* gallery page palette */
        "g-bg": "#faf9f6",
        "g-surface": "#ffffff",
        "g-900": "#0c342c",
        "g-800": "#0f3830",
        "g-700": "#114639",
        "g-chip": "#f5f5f6",
        "g-tag": "#f1f3f4",
        "g-heart": "#f76b78",
        "g-ink": "#0b1f1b",
        "g-ink2": "#30393e",
        "g-muted": "#686c6d",
        "g-nav": "#3a4047",
        "g-meta": "#73797f",
        "g-line": "#ebeaeb",

        /* NEW: service page palette (matches provided HTML) */
        "sp-bg": "#fbf9f7",
        "sp-white": "#fefcfb",
        "sp-gdark": "#0b231f",
        "sp-green": "#103d32",
        "sp-greenMid": "#274137",
        "sp-mint": "#70ac90",
        "sp-gold": "#f4d690",
        "sp-goldText": "#e5c279",
        "sp-panel": "#f0f2ee",
        "sp-cta": "#f8efe8",
        "sp-text": "#0b231f",
        "sp-muted": "#7a817e",
        "sp-amber": "#de8f0e",
        "sp-i1": "#f7edd9",
        "sp-i2": "#fdebd3",
        "sp-i3": "#e6ece7",
        "sp-i4": "#feeae5",
      },
      fontFamily: {
        newsreader: ["Newsreader", "Georgia", "serif"],
        inter: ["Inter", "system-ui", "sans-serif"],
        allura: ["Allura", "cursive"],
        playfair: ['"Playfair Display"', "Georgia", "serif"],
        baskerville: ['"Libre Baskerville"', "Georgia", "serif"],
        dancing: ['"Dancing Script"', "cursive"],
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise .9s cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
};
