import {
  colors,
  fonts,
  radius,
  spacing,
  touchTarget,
} from "./index";

// ======================================================
// Settings screen styles
// ======================================================
//
// The look shared by the massage settings screens
// (massages, therapists, rooms, settings): a page title,
// an add button, an edit form in a card, and a card per
// item with text-button actions. Each screen spreads
// these into its own StyleSheet and adds what is
// particular to it.
// ======================================================

export const settingsStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
  },

  title: {
    fontFamily: fonts.semibold,
    fontSize: 26,
    letterSpacing: -0.4,
    color: colors.text,
  },

  description: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },

  addButton: {
    flex: 0,
    marginBottom: spacing.xl,
  },

  // Edit form

  formCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },

  formTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.md + 2,
  },

  field: {
    marginBottom: spacing.md + 2,
  },

  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
    marginBottom: 6,
  },

  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.sm + 2,
  },

  input: {
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.text,
  },

  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  row: {
    flexDirection: "row",
    gap: spacing.md,
  },

  rowItem: {
    flex: 1,
  },

  // Buttons

  button: {
    flex: 1,
    minHeight: touchTarget,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },

  primaryButton: {
    backgroundColor: colors.primary,
  },

  primaryText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.onPrimary,
  },

  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  secondaryText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },

  disabled: {
    opacity: 0.5,
  },

  empty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: "center",
    color: colors.textMuted,
    marginTop: spacing.xl,
  },

  // Item cards

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  inactiveCard: {
    backgroundColor: colors.surfaceMuted,
    opacity: 0.7,
  },

  cardName: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  cardMeta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  cardActions: {
    flexDirection: "row",
    gap: spacing.xl,
    marginTop: spacing.md + 2,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  link: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.primary,
  },

  dangerLink: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.danger,
  },
};

// Colours for the React Native Switch.
export const switchColors = {
  trackColor: {
    false: colors.border,
    true: colors.primary,
  },
  thumbColor: colors.surface,
  ios_backgroundColor: colors.border,
};
