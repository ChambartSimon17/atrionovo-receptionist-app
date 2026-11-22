import "../web/setup";


import {
  Stack,
  useRouter,
  useSegments,
} from "expo-router";

import {
  useEffect,
} from "react";

import {
  GestureHandlerRootView,
} from "react-native-gesture-handler";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";

import * as SplashScreen from "expo-splash-screen";

import {
  AuthProvider,
  useAuth,
} from "../context/auth-context";

import {
  getHomeRoute,
  isRouteAllowed,
} from "../utils/business-type";

import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import {
  setMonitoringBusiness,
  withMonitoring,
} from "../services/monitoring";
import {
  addNotificationResponseListener,
  registerPushNotifications,
} from "../services/notifications";

import { colors, isDark } from "../theme";
import { watchSystemAppearance } from "../theme/appearance";

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const {
    isAuthenticated,
    isLoading,
    businessType,
    business,
    accessToken,
  } = useAuth();

  const router = useRouter();
  const segments = useSegments();

  // Once logged in: push notifications for this phone,
  // and the business on error reports.
  useEffect(() => {
    setMonitoringBusiness(isAuthenticated ? business : null);

    if (isAuthenticated && accessToken) {
      registerPushNotifications(accessToken);
    }
    // Only when the business changes, not on every
    // refreshed access token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, business?.id]);

  useEffect(
    () => addNotificationResponseListener((route) => router.push(route)),
    [router]
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inAuthScreen =
      segments[0] === "login";

    if (
      !isAuthenticated &&
      !inAuthScreen
    ) {
      router.replace("/login");
      return;
    }

    if (
      isAuthenticated &&
      inAuthScreen
    ) {
      router.replace(
        getHomeRoute(businessType)
      );
      return;
    }

    // A business can only open the screens of its own
    // type, so a massage owner never lands on a
    // restaurant screen and the other way around.
    if (
      isAuthenticated &&
      !isRouteAllowed(
        businessType,
        segments
      )
    ) {
      router.replace(
        getHomeRoute(businessType)
      );
    }
  }, [
    isAuthenticated,
    isLoading,
    businessType,
    segments,
  ]);

  // While the stored login is being checked there is no
  // business yet; screens that read it would crash (on
  // the web on every page refresh). Nothing navigates in
  // this phase, so the navigator can wait.
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Every screen of a business needs a logged-in user.
  // Logged out (logout, an expired session, a link opened
  // in the browser) they are not drawn at all, and only
  // the login screen and the start screen remain.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(restaurant)" />
        <Stack.Screen name="massage" />
        <Stack.Screen name="analytics" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="calls/index" />
        <Stack.Screen name="calls/[id]" />
        <Stack.Screen name="customers/[id]" />
        <Stack.Screen name="floor-plan/edit" />
        <Stack.Screen name="reservation/[id]" />
        <Stack.Screen name="reservation/confirm" />
        <Stack.Screen name="reservation/customer" />
        <Stack.Screen name="reservation/edit" />
        <Stack.Screen name="reservation/new" />
        <Stack.Screen name="reservation/new-customer" />
        <Stack.Screen name="settings/business" />
        <Stack.Screen name="settings/opening-hours" />
        <Stack.Screen name="settings/special-opening-days" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Keep the splash screen up until Inter is ready, so
  // text never flashes in the system font.
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Follow the phone when it switches between light and
  // dark (the styles are made once, so this reloads).
  useEffect(() => watchSystemAppearance(isDark), []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1 }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default withMonitoring(RootLayout);
