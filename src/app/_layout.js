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

function AuthGuard() {
  const {
    isAuthenticated,
    isLoading,
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
      router.replace("/dashboard");
    }
  }, [
    isAuthenticated,
    isLoading,
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