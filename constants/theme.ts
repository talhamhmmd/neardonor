/**
 * NearDonor centralized design tokens.
 *
 * Single source of truth for color, spacing, radius, shadow and typography.
 * Keep in sync with `tailwind.config.js` so NativeWind utilities and
 * JS-driven styles (maps, charts, dynamic tints) never diverge.
 */

export const colors = {
  /** Brand / primary action color. Royal Blue. */
  primary: "#305CDE",
  primaryLight: "#6BA8F7",
  primaryDark: "#2348B5",
  /** App screen background. */
  background: "#F8FAFC",
  /** Cards / surfaces. */
  surface: "#FFFFFF",
  /** Primary text. */
  ink: "#111827",
  /** Secondary / muted text. */
  inkSecondary: "#64748B",
  success: "#16A34A",
  warning: "#F59E0B",
  /** Red reserved for genuine emergency / destructive states only. */
  danger: "#DC2626",
  border: "#E5E7EB",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: "800" },
  h1: { fontSize: 26, lineHeight: 34, fontWeight: "700" },
  h2: { fontSize: 22, lineHeight: 30, fontWeight: "700" },
  h3: { fontSize: 18, lineHeight: 26, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  button: { fontSize: 16, lineHeight: 20, fontWeight: "600" },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
} as const;

export const shadows = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sheet: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
} as const;

export const zIndex = {
  modal: 1000,
  sheet: 900,
  overlay: 800,
} as const;