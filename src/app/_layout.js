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
  BUSINESS_TYPES,
  getHomeRoute,
  isRouteAllowed,
} from "../utils/business-type";

import { settingsHeader } from "../theme/settingsHeader";

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const {
    isAuthenticated,
    isLoading,
    businessType,
  } = useAuth();

  const router = useRouter();
  const segments = useSegments();

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

  // Massage businesses open the shared opening-hours
  // screens from "Meer"; give them a back button there.
  // Restaurants keep these screens as they were.
  const sharedSettingsOptions =
    businessType === BUSINESS_TYPES.MASSAGE
      ? settingsHeader
      : {};

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="settings/opening-hours"
        options={sharedSettingsOptions}
      />
      <Stack.Screen
        name="settings/special-opening-days"
        options={sharedSettingsOptions}
      />
    </Stack>
  );
}

export default function RootLayout() {
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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1 }}
    >
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}