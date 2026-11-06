import { Stack } from "expo-router";

import { settingsHeader } from "../../theme/settingsHeader";

// ======================================================
// Massage screens
// ======================================================
//
// The tabs, the client profile, the new appointment flow,
// the analytics and the time clock draw their own top
// bar. The settings
// screens opened from "Meer" get a slim native header
// with a back button; their own title stays in the
// content.
// ======================================================

export default function MassageLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="services" options={settingsHeader} />
      <Stack.Screen name="therapists" options={settingsHeader} />
      <Stack.Screen name="rooms" options={settingsHeader} />
      <Stack.Screen name="clients" options={settingsHeader} />
      <Stack.Screen name="payments" options={settingsHeader} />
      <Stack.Screen name="team/[id]" options={settingsHeader} />
      <Stack.Screen name="team/absence/[id]" options={settingsHeader} />
      <Stack.Screen name="checkout/[id]" options={settingsHeader} />
      <Stack.Screen
        name="clock"
        options={{ gestureEnabled: false, animation: "fade" }}
      />
    </Stack>
  );
}
