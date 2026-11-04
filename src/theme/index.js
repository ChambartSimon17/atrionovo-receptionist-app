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
// ======================================================

export const colors = {
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

  // Surfaces
  background: "#F6F4EF",
  surface: "#FFFFFF",
  surfaceMuted: "#EFECE6",
  segmentTrack: "#ECE8E0",

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
};

// Appointment and reservation statuses, the same on
// every screen.
export const statusColors = {
  CONFIRMED: { background: "#E6F1FB", text: "#0C447C" },
  IN_PROGRESS: { background: colors.primary, text: colors.onPrimary },
  ARRIVING: { background: "#FAEEDA", text: "#633806" },
  SEATED: { background: colors.primary, text: colors.onPrimary },
  COMPLETED: { background: "#EAF3DE", text: "#27500A" },
  NO_SHOW: { background: "#FAEEDA", text: "#633806" },
  CANCELLED: { background: "#F1EFE8", text: "#444441" },
};

// Tables on the floor plan, by reservation state.
export const tableColors = {
  AVAILABLE: { background: colors.surface, border: colors.border, text: colors.text, muted: colors.textMuted },
  RESERVED: { background: colors.primarySoft, border: colors.primaryBorder, text: colors.primary, muted: colors.primary },
  ARRIVING: { background: "#FAEEDA", border: "#E2B970", text: "#633806", muted: "#8A5A14" },
  SEATED: { background: colors.primary, border: colors.primary, text: colors.onPrimary, muted: colors.onPrimaryMuted },
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
