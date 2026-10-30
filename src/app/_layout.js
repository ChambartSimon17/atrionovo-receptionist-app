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
  AuthProvider,
  useAuth,
} from "../context/auth-context";

import {
  getHomeRoute,
  isRouteAllowed,
} from "../utils/business-type";

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

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

export default function RootLayout() {
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