/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#305CDE",
        "primary-light": "#6BA8F7",
        "primary-dark": "#2348B5",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        ink: "#111827",
        "ink-secondary": "#64748B",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
        border: "#E5E7EB",
      },
      fontSize: {
        display: ["32px", { lineHeight: "40px", fontWeight: "800" }],
        h1: ["26px", { lineHeight: "34px", fontWeight: "700" }],
        h2: ["22px", { lineHeight: "30px", fontWeight: "700" }],
        h3: ["18px", { lineHeight: "26px", fontWeight: "600" }],
        body: ["16px", { lineHeight: "24px" }],
        "body-small": ["14px", { lineHeight: "20px" }],
        caption: ["12px", { lineHeight: "16px" }],
        button: ["16px", { lineHeight: "20px", fontWeight: "600" }],
        label: ["13px", { lineHeight: "18px", fontWeight: "500" }],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        card: "0px 2px 8px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};
