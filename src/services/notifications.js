import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { api } from "./api";

// ======================================================
// Push notifications
// ======================================================
//
// After login the phone asks once for permission and
// sends its Expo push token to the backend. The backend
// then notifies every logged-in phone of the business
// when the AI receptionist makes a booking, or when a
// caller needs to be called back. Logging out removes
// the token, so a phone that was handed over stays quiet.
//
// Tapping a notification opens the reservation, the
// appointment day or the call.
// ======================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let currentToken = null;

export async function registerPushNotifications(accessToken) {
  try {
    // Simulators cannot receive push notifications.
    if (!Device.isDevice || !accessToken) {
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "AtrioNovo",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();

    if (status !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }

    if (status !== "granted") {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await api.registerPushToken(token, accessToken);
    currentToken = token;

    return token;
  } catch {
    // No push (no permission, no network, no Apple push
    // entitlement in this build): the app works without.
    return null;
  }
}

export async function unregisterPushNotifications(accessToken) {
  if (!currentToken || !accessToken) {
    return;
  }

  try {
    await api.removePushToken(currentToken, accessToken);
  } catch {
    // The backend forgets stale tokens itself.
  } finally {
    currentToken = null;
  }
}

/**
 * Where a tapped notification leads.
 */
export function routeForNotification(data) {
  switch (data?.type) {
    case "reservation":
      return data.reservationId ? `/reservation/${data.reservationId}` : "/dashboard";
    case "appointment":
      return "/massage/dashboard";
    case "call":
      return data.callId ? `/calls/${data.callId}` : "/calls";
    default:
      return null;
  }
}

export function addNotificationResponseListener(onRoute) {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const route = routeForNotification(
        response?.notification?.request?.content?.data
      );

      if (route) {
        onRoute(route);
      }
    }
  );

  return () => subscription.remove();
}
