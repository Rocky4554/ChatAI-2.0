/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      extend: {
        animation: {
          "float-15": "float 15s infinite ease-in-out",
          "float-12-reverse": "float 12s infinite ease-in-out reverse",
          "float-10": "float 10s infinite ease-in-out",
          "gradient-shift": "gradient-shift 8s ease infinite",
        },
        keyframes: {
          float: {
            "0%, 100%": { transform: "translate(0, 0)" },
            "50%": { transform: "translate(20px, 20px)" },
          },
          "gradient-shift": {
            "0%": { "background-position": "0% 50%" },
            "50%": { "background-position": "100% 50%" },
            "100%": { "background-position": "0% 50%" },
          },
        },
      },
    },
  },
  plugins: [],
};
