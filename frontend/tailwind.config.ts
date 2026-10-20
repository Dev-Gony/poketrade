import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/**
 * 테마별 디자인 토큰. 기본(원본 Stitch) 팔레트는 dark 이고,
 * light 는 #F8FAFC 배경 / #0F172A 텍스트를 기준으로 같은 색상 계열을 밝은 톤으로 반전했다.
 * 각 토큰은 CSS 변수(--color-*)로 출력되어 `.dark` 클래스 유무에 따라 전환된다.
 */
const DARK_PALETTE = {
  "tertiary-fixed-dim": "#4cd7f6",
  "on-tertiary-fixed": "#001f26",
  "on-error": "#690005",
  "on-background": "#e4e1e7",
  "secondary-fixed-dim": "#ffb95f",
  "surface-container-highest": "#353439",
  "on-secondary-fixed": "#2a1700",
  surface: "#131317",
  error: "#ffb4ab",
  "surface-variant": "#353439",
  "on-surface-variant": "#cbc3d7",
  "inverse-surface": "#e4e1e7",
  "surface-container": "#1f1f23",
  "surface-tint": "#d0bcff",
  "on-tertiary-container": "#002f38",
  "surface-container-high": "#2a292e",
  "tertiary-fixed": "#acedff",
  "tertiary-container": "#009eb9",
  secondary: "#ffb95f",
  "on-primary-container": "#340080",
  "surface-container-low": "#1b1b1f",
  "primary-fixed": "#e9ddff",
  "surface-container-lowest": "#0e0e12",
  primary: "#d0bcff",
  "inverse-on-surface": "#303034",
  "on-primary": "#3c0091",
  "surface-dim": "#131317",
  "on-secondary-container": "#5b3800",
  background: "#131317",
  "on-tertiary": "#003640",
  "primary-fixed-dim": "#d0bcff",
  "on-secondary": "#472a00",
  outline: "#958ea0",
  "secondary-container": "#ee9800",
  "on-tertiary-fixed-variant": "#004e5c",
  "error-container": "#93000a",
  "outline-variant": "#494454",
  tertiary: "#4cd7f6",
  "on-primary-fixed": "#23005c",
  "inverse-primary": "#6d3bd7",
  "on-secondary-fixed-variant": "#653e00",
  "on-primary-fixed-variant": "#5516be",
  "surface-bright": "#39393d",
  "primary-container": "#a078ff",
  "on-error-container": "#ffdad6",
  "on-surface": "#e4e1e7",
  "secondary-fixed": "#ffddb8",
} as const;

type ColorToken = keyof typeof DARK_PALETTE;

const LIGHT_PALETTE: Record<ColorToken, string> = {
  // *-fixed 계열은 Material 3 규칙대로 테마와 무관하게 동일
  "tertiary-fixed-dim": "#4cd7f6",
  "on-tertiary-fixed": "#001f26",
  "secondary-fixed-dim": "#ffb95f",
  "on-secondary-fixed": "#2a1700",
  "tertiary-fixed": "#acedff",
  "primary-fixed": "#e9ddff",
  "primary-fixed-dim": "#d0bcff",
  "on-tertiary-fixed-variant": "#004e5c",
  "on-primary-fixed": "#23005c",
  "on-secondary-fixed-variant": "#653e00",
  "on-primary-fixed-variant": "#5516be",
  "secondary-fixed": "#ffddb8",

  // Surfaces (slate 계열)
  background: "#f8fafc",
  surface: "#f8fafc",
  "surface-dim": "#e2e8f0",
  "surface-bright": "#ffffff",
  "surface-container-lowest": "#ffffff",
  "surface-container-low": "#f1f5f9",
  "surface-container": "#e9eef5",
  "surface-container-high": "#e2e8f0",
  "surface-container-highest": "#d5dce6",
  "surface-variant": "#e2e8f0",
  "on-background": "#0f172a",
  "on-surface": "#0f172a",
  "on-surface-variant": "#475569",
  outline: "#64748b",
  "outline-variant": "#cbd5e1",
  "inverse-surface": "#1e293b",
  "inverse-on-surface": "#f1f5f9",

  // Accents: 밝은 배경 위 텍스트로 쓰여도 대비가 확보되도록 한 단계 진한 톤
  primary: "#6d3bd7",
  "on-primary": "#ffffff",
  "primary-container": "#7c4dff",
  "on-primary-container": "#ffffff",
  "inverse-primary": "#d0bcff",
  "surface-tint": "#6d3bd7",
  secondary: "#8a5100",
  "on-secondary": "#ffffff",
  "secondary-container": "#ee9800",
  "on-secondary-container": "#2a1700",
  tertiary: "#00687a",
  "on-tertiary": "#ffffff",
  "tertiary-container": "#009eb9",
  "on-tertiary-container": "#001f26",
  error: "#ba1a1a",
  "on-error": "#ffffff",
  "error-container": "#ffdad6",
  "on-error-container": "#410002",
};

const toRgbChannels = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const toCssVars = (palette: Record<ColorToken, string>) =>
  Object.fromEntries(Object.entries(palette).map(([token, hex]) => [`--color-${token}`, toRgbChannels(hex)]));

const TOKENS = Object.keys(DARK_PALETTE) as ColorToken[];

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // <alpha-value> 덕분에 bg-primary/20 같은 투명도 수식어가 그대로 동작한다.
      colors: Object.fromEntries(TOKENS.map((token) => [token, `rgb(var(--color-${token}) / <alpha-value>)`])),
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        "space-sm": "0.5rem",
        "margin-mobile": "1rem",
        "space-xs": "0.25rem",
        margin: "2rem",
        "space-lg": "1.5rem",
        "gutter-mobile": "0.75rem",
        "space-xl": "2.5rem",
        gutter: "1.5rem",
        "space-md": "1rem",
      },
      fontFamily: {
        "label-caps": ["Plus Jakarta Sans"],
        "headline-lg": ["Plus Jakarta Sans"],
        "label-numeric-md": ["JetBrains Mono"],
        "body-sm": ["Inter"],
        "label-numeric-lg": ["JetBrains Mono"],
        display: ["Plus Jakarta Sans"],
        "body-lg": ["Inter"],
        "body-md": ["Inter"],
        "label-numeric-sm": ["JetBrains Mono"],
        "headline-sm": ["Plus Jakarta Sans"],
        "display-mobile": ["Plus Jakarta Sans"],
        "headline-md": ["Plus Jakarta Sans"],
        "headline-lg-mobile": ["Plus Jakarta Sans"],
      },
      fontSize: {
        "label-caps": ["11px", { lineHeight: "14px", letterSpacing: "0.08em", fontWeight: "700" }],
        "headline-lg": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "label-numeric-md": ["14px", { lineHeight: "20px", letterSpacing: "-0.01em", fontWeight: "500" }],
        "body-sm": ["12px", { lineHeight: "16px", letterSpacing: "0", fontWeight: "400" }],
        "label-numeric-lg": ["18px", { lineHeight: "24px", letterSpacing: "-0.02em", fontWeight: "600" }],
        display: ["56px", { lineHeight: "64px", letterSpacing: "-0.03em", fontWeight: "800" }],
        "body-lg": ["16px", { lineHeight: "24px", letterSpacing: "0", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", letterSpacing: "0", fontWeight: "400" }],
        "label-numeric-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.04em", fontWeight: "500" }],
        "headline-sm": ["20px", { lineHeight: "28px", letterSpacing: "-0.005em", fontWeight: "600" }],
        "display-mobile": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-md": ["28px", { lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg-mobile": ["28px", { lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: "700" }],
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        // 원본 .animate-ticker 와 동일한 이름으로 생성된다 (animate-ticker)
        ticker: "marquee 35s linear infinite",
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ":root": { ...toCssVars(LIGHT_PALETTE), colorScheme: "light" },
        ":root.dark": { ...toCssVars(DARK_PALETTE), colorScheme: "dark" },
      });
    }),
  ],
};

export default config;
