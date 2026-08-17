import { Redirect } from "expo-router";
import {
  ActivityIndicator,
  View,
} from "react-native";

import { useAuth } from "../context/auth-context";

export default function Index() {
  const {
    isAuthenticated,
    isLoading,
  } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return (
      <Redirect href="/dashboard" />
    );
  }

  return (
    <Redirect href="/login" />
  );
}