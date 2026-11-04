import { Appearance } from "react-native";

// Applies the stored choice before the palette is picked.
import "./appearance";

// ======================================================
// Theme (Eucalyptus)
// ======================================================
//
// Every colour, size and font of the app. Screens
// and components read from here instead of hard-coding
// values, so the look stays the same everywhere.
//
// The look follows coss ui: thin borders, rounded cards,
// Inter, pill chips and segmented controls.
//
// Light and dark: the palette is chosen once, when the
// app starts, from the phone setting (or the choice in
// Instellingen, see theme/appearance.js). Styles are
// created at import time, so a change of appearance
// reloads the app.
// ======================================================

const light = {
  // Brand
  primary: "#1F5F55",
  primaryPressed: "#174A42",
  primarySoft: "#E3EEEA",
  primaryBorder: "#B9D5CB",
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "#CFE3DC",
  sage: "#8FB9A8",
  sand: "#D9C6A5",
  sandSoft: "#F3ECDF",
  onSand: "#633806",

  // Surfaces
  background: "#F6F4EF",
  surface: "#FFFFFF",
  surfaceMuted: "#EFECE6",
  segmentTrack: "#ECE8E0",
  overlay: "rgba(28, 36, 33, 0.45)",

  // Lines
  border: "#E4E0D8",
  divider: "#EFECE6",

  // Text
  text: "#1C2421",
  textMuted: "#5B6661",
  textDisabled: "#8A918D",

  // Feedback
  positive: "#2F6B2A",
  danger: "#A32D2D",
  dangerSoft: "#FCEBEB",
  live: "#C2552E",
  warning: "#633806",
  warningSoft: "#FAEEDA",
  info: "#0C447C",
  infoSoft: "#E6F1FB",

  // Notes on a booking (allergies, birthdays)
  noteBackground: "#FBF6EC",
  noteBorder: "#EADCC0",
  noteText: "#6B5326",
  noteStrong: "#3B3324",

  // Skeleton loaders
  skeleton: "#ECE8E0",
};

const dark = {
  primary: "#3E9481",
  primaryPressed: "#2F7A6C",
  primarySoft: "#1D332E",
  primaryBorder: "#2E5A50",
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "#C4DED6",
  sage: "#5E8C7B",
  sand: "#8A7A5C",
  sandSoft: "#2E2820",
  onSand: "#F2CC85",

  background: "#111715",
  surface: "#1A2220",
  surfaceMuted: "#222B28",
  segmentTrack: "#222B28",
  overlay: "rgba(0, 0, 0, 0.6)",

  border: "#2C3733",
  divider: "#242E2A",

  text: "#E8ECEA",
  textMuted: "#9AA6A1",
  textDisabled: "#6B7672",

  positive: "#7CC47A",
  danger: "#F08A8A",
  dangerSoft: "#3A1F1F",
  live: "#E8875D",
  warning: "#F2CC85",
  warningSoft: "#3A2C12",
  info: "#A8CCF0",
  infoSoft: "#16304A",

  noteBackground: "#2A2419",
  noteBorder: "#4A3F2A",
  noteText: "#D9C39A",
  noteStrong: "#F0E2C4",

  skeleton: "#242E2A",
};

export const isDark = Appearance.getColorScheme() === "dark";

export const colors = isDark ? dark : light;

// Appointment and reservation statuses, the same on
// every screen.
export const statusColors = {
  CONFIRMED: { background: colors.infoSoft, text: colors.info },
  IN_PROGRESS: { background: colors.primary, text: colors.onPrimary },
  ARRIVING: { background: colors.warningSoft, text: colors.warning },
  SEATED: { background: colors.primary, text: colors.onPrimary },
  COMPLETED: isDark
    ? { background: "#1F3318", text: "#B5D99A" }
    : { background: "#EAF3DE", text: "#27500A" },
  NO_SHOW: { background: colors.dangerSoft, text: colors.danger },
  CANCELLED: isDark
    ? { background: "#2A2A28", text: "#C8C6BE" }
    : { background: "#F1EFE8", text: "#444441" },
};

// Tables on the floor plan list, by reservation state.
export const tableColors = {
  AVAILABLE: { background: colors.surface, border: colors.border, text: colors.text, muted: colors.textMuted },
  RESERVED: { background: colors.primarySoft, border: colors.primaryBorder, text: colors.primary, muted: colors.primary },
  ARRIVING: isDark
    ? { background: "#3A2C12", border: "#7A5A20", text: "#F2CC85", muted: "#D9AE57" }
    : { background: "#FAEEDA", border: "#E2B970", text: "#633806", muted: "#8A5A14" },
  SEATED: { background: colors.primary, border: colors.primary, text: colors.onPrimary, muted: colors.onPrimaryMuted },
};

// The floor plan canvas is dark in both appearances,
// like an architect's drawing: light furniture on a
// dark floor.
export const floorColors = {
  canvas: isDark ? "#0E1513" : "#1E2A27",
  grid: isDark ? "#1F2B28" : "#2F3D39",
  wall: "#5E6E68",
  decor: "#3A4843",
  decorBorder: "#566660",
  decorText: "#AFC0B9",
  area: "#2A3834",
  areaText: "#AFC0B9",
  door: "#B5C5BE",
  window: "#7FA7C4",
  plant: "#3E6B55",
  plantLeaf: "#4F8468",
  selection: "#F6F4EF",
  handle: "#FFFFFF",
  // By table or room state.
  free: { fill: "#E9E4DA", chair: "#CFC8BB", text: "#3B3F3C" },
  reserved: { fill: "#9CC3B5", chair: "#7FAE9F", text: "#103F37" },
  arriving: { fill: "#F0C978", chair: "#D9AE57", text: "#5A3504" },
  late: { fill: "#E8A27A", chair: "#D0875D", text: "#4A1B0C" },
  seated: { fill: "#2F7A6C", chair: "#256559", text: "#FFFFFF" },
  cleaning: { fill: "#B9B4AA", chair: "#A8A398", text: "#2C2C2A" },
  inactive: { fill: "#5B6661", chair: "#4A544F", text: "#F6F4EF" },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
};

export const type = {
  title: { fontFamily: fonts.semibold, fontSize: 26, letterSpacing: -0.4, color: colors.text },
  heading: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  caption: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  label: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted },
};

// Minimum size of anything you can tap.
export const touchTarget = 44;
