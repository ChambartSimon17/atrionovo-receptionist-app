import { Redirect } from "expo-router";
import {
  ActivityIndicator,
  View,
} from "react-native";

import { useAuth } from "../context/auth-context";
import { getHomeRoute } from "../utils/business-type";

export default function Index() {
  const {
    isAuthenticated,
    isLoading,
    businessType,
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
      <Redirect href={getHomeRoute(businessType)} />
    );
  }

  return (
    <Redirect href="/login" />
  );
}