import { Stack } from "expo-router";

import { colors, fonts } from "../../theme";

// ======================================================
// Massage screens
// ======================================================
//
// The tabs, the client profile, the new appointment flow
// and the analytics draw their own top bar. The settings
// screens opened from "Meer" get a slim native header
// with a back button; their own title stays in the
// content.
// ======================================================

const SETTINGS_HEADER = {
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

export default function MassageLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="services" options={SETTINGS_HEADER} />
      <Stack.Screen name="therapists" options={SETTINGS_HEADER} />
      <Stack.Screen name="rooms" options={SETTINGS_HEADER} />
      <Stack.Screen name="settings" options={SETTINGS_HEADER} />
    </Stack>
  );
}
