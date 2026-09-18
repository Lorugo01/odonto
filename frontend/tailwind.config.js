export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens semânticos do tema claro clínico.
        // `canvas` é o fundo da aplicação, `surface` são os cards/painéis,
        // `line` as bordas e `ink` a tinta (texto).
        primary: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          soft: "var(--brand-soft)",
        },
        secondary: "#0F766E",
        canvas: "#F1F5F9",
        surface: "#FFFFFF",
        line: "#E2E8F0",
        ink: {
          DEFAULT: "#0F172A",
          muted: "#64748B",
          soft: "#94A3B8",
        },
        success: { DEFAULT: "#16A34A", soft: "#DCFCE7" },
        warning: { DEFAULT: "#D97706", soft: "#FEF3C7" },
        danger: { DEFAULT: "#DC2626", soft: "#FEE2E2" },
        // Tinta escura usada como texto sobre chips de cor forte (odontograma).
        neutral: "#0F172A",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        pop: "0 10px 30px -12px rgb(15 23 42 / 0.25)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
      },
    },
  },
  plugins: [],
};
