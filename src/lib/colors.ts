/**
 * PARTIU — Master Color Palette "Azul Tech Premium"
 *
 * Single source of truth for all official brand and UI colors.
 * WCAG AA compliant contrast pairings.
 */

export const colors = {
  // Primary scale
  primary: {
    900: "#003366", // Dark Blue (Brand foundation)
    800: "#004C99",
    700: "#0066CC",
    600: "#0088FF", // Vibrant Blue (Brand interaction / CTAs)
    500: "#00A3FF",
    400: "#00C6FF",
    100: "#E0F0FF",
    50: "#F0F7FF",
  },

  // High-tech Cyan Accent
  accent: "#00C6FF",

  // Backgrounds & Surfaces
  background: "#F8FAFC",
  surface: "#FFFFFF",

  // Typography tokens
  text: {
    primary: "#0F172A",
    secondary: "#475569",
    tertiary: "#94A3B8",
    inverse: "#FFFFFF",
  },

  // Borders
  border: {
    default: "#E2E8F0",
    soft: "#F1F5F9",
  },

  // Semantics
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
} as const;

export default colors;
