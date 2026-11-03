import { colors, fonts } from "./index";

// ======================================================
// Settings header
// ======================================================
//
// A slim native header with only a "Terug" button, for the
// massage settings screens that keep their own title in
// the content.
// ======================================================

export const settingsHeader = {
  headerShown: true,
  title: "",
  headerBackTitle: "Terug",
  headerTintColor: colors.primary,
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: colors.background,
  },
  headerBackTitleStyle: {
    fontFamily: fonts.medium,
  },
  contentStyle: {
    backgroundColor: colors.background,
  },
};
