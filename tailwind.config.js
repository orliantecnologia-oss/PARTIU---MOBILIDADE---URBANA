/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          "primary-deep": "var(--brand-primary-deep, #003366)",
          "primary-vibrant": "var(--brand-primary-vibrant, #0088FF)",
          "primary-accent": "var(--brand-primary-accent, #00C6FF)",
          "bg-neutral": "var(--brand-bg-neutral, #F8FAFC)",
          "surface-card": "var(--brand-surface-card, #FFFFFF)",
          "status-green": "var(--brand-status-green, #22C55E)",
          "danger-red": "var(--brand-danger-red, #EF4444)",
          "border-subtle": "var(--brand-border-subtle, #E2E8F0)",
          "pill-bg": "var(--brand-pill-bg, #F1F5F9)",
        },
      },
    },
  },
  plugins: [],
};
