/**
 * PARTIU — Design Tokens "Azul Tech Premium"
 *
 * Single source of truth for all visual tokens.
 * Every component MUST import colors from here instead of hardcoding hex values.
 *
 * @see styles.css for CSS custom property equivalents consumed by Tailwind.
 */

// ─────────────────────────────────────────────────────────────
// PRIMARY SCALE
// ─────────────────────────────────────────────────────────────
export const colors = {
  primary: {
    900: "#003366",
    800: "#004C99",
    700: "#0066CC",
    600: "#0088FF",
    500: "#00A3FF",
    400: "#00C6FF",
    100: "#E0F0FF",
    50: "#F0F7FF",
  },

  accent: "#00C6FF",

  background: "#F8FAFC",
  surface: "#FFFFFF",

  text: {
    primary: "#0F172A",
    secondary: "#475569",
    tertiary: "#94A3B8",
    inverse: "#FFFFFF",
  },

  border: {
    default: "#E2E8F0",
    soft: "#F1F5F9",
  },

  semantic: {
    success: "#22C55E",
    successSoft: "#ECFDF5",
    warning: "#F59E0B",
    warningSoft: "#FFFBEB",
    danger: "#EF4444",
    dangerSoft: "#FEF2F2",
    info: "#0088FF",
    infoSoft: "#EFF6FF",
  },

  /** Dark mode overrides */
  dark: {
    background: "#090D16",
    surface: "#111827",
    card: "#111827",
    border: "rgba(255, 255, 255, 0.1)",
    textSecondary: "#94A3B8",
  },
} as const;

// ─────────────────────────────────────────────────────────────
// GRADIENTS
// ─────────────────────────────────────────────────────────────
export const gradients = {
  /** Primary CTA gradient — used on all main action buttons */
  primary: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",

  /** Rainbow gradient — Estilo Arco-íris Vibrante & Moderno */
  rainbow:
    "linear-gradient(90deg, #E11D48 0%, #EA580C 16%, #F59E0B 32%, #10B981 48%, #06B6D4 64%, #3B82F6 80%, #8B5CF6 100%)",

  /** Rainbow Mesh alternativo */
  rainbowMesh:
    "linear-gradient(135deg, #FF007A 0%, #7928CA 20%, #0070F3 42%, #00DFD8 65%, #10B981 82%, #F59E0B 100%)",

  /** Header gradient (Arco-íris) */
  header:
    "linear-gradient(90deg, #E11D48 0%, #EA580C 16%, #F59E0B 32%, #10B981 48%, #06B6D4 64%, #3B82F6 80%, #8B5CF6 100%)",

  /** Bottom nav dark gradient — Alto Contraste Obsidian */
  bottomNav: "linear-gradient(180deg, #0F172A 0%, #020617 100%)",

  /** Accent subtle glow */
  accentGlow: "linear-gradient(135deg, #00C6FF 0%, #0088FF 100%)",

  /** Hero background gradient */
  hero: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
} as const;

// ─────────────────────────────────────────────────────────────
// SHADOWS
// ─────────────────────────────────────────────────────────────
export const shadows = {
  soft: "0 2px 8px rgba(0, 0, 0, 0.05)",
  card: "0 4px 18px rgba(0, 0, 0, 0.07)",
  elevated: "0 10px 30px rgba(0, 0, 0, 0.10)",
  button: "0 4px 14px rgba(0, 51, 102, 0.25)",
  buttonHover: "0 6px 20px rgba(0, 51, 102, 0.35)",
  nav: "0 -4px 20px rgba(0, 0, 0, 0.08)",
  glow: "0 0 20px rgba(0, 136, 255, 0.30)",
} as const;

// ─────────────────────────────────────────────────────────────
// RADII
// ─────────────────────────────────────────────────────────────
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  full: 9999,
} as const;

// ─────────────────────────────────────────────────────────────
// SPACING
// ─────────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
} as const;

// ─────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────────────────────
export const typography = {
  family: {
    sans: '"Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  },
} as const;

// ─────────────────────────────────────────────────────────────
// ANIMATION
// ─────────────────────────────────────────────────────────────
export const animation = {
  fast: "150ms",
  normal: "250ms",
  slow: "350ms",
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

// ─────────────────────────────────────────────────────────────
// COMPONENT-SPECIFIC TOKENS
// ─────────────────────────────────────────────────────────────
export const components = {
  header: {
    gradient: gradients.header,
    borderRadius: 16,
    textColor: colors.text.inverse,
  },
  bottomNav: {
    background: "#0A2342",
    gradient: gradients.bottomNav,
    activeIconColor: colors.text.inverse,
    activeTextColor: colors.text.inverse,
    inactiveColor: "rgba(255, 255, 255, 0.45)",
    activePill: {
      background: "rgba(0, 198, 255, 0.15)",
      border: "rgba(0, 198, 255, 0.35)",
    },
    borderRadius: radii["3xl"],
  },
  button: {
    gradient: gradients.primary,
    textColor: colors.text.inverse,
    borderRadius: radii.lg,
    shadow: shadows.button,
    shadowHover: shadows.buttonHover,
    disabledOpacity: 0.5,
  },
  card: {
    background: colors.surface,
    borderRadius: radii.lg,
    shadow: shadows.card,
    border: colors.border.soft,
  },
  input: {
    focusColor: colors.primary[600],
    focusRing: `0 0 0 3px rgba(0, 136, 255, 0.2)`,
    borderColor: colors.border.default,
    borderRadius: radii.md,
  },
} as const;

export type DesignTokens = {
  colors: typeof colors;
  gradients: typeof gradients;
  shadows: typeof shadows;
  radii: typeof radii;
  spacing: typeof spacing;
  typography: typeof typography;
  animation: typeof animation;
  components: typeof components;
};

const tokens: DesignTokens = {
  colors,
  gradients,
  shadows,
  radii,
  spacing,
  typography,
  animation,
  components,
};

export default tokens;
