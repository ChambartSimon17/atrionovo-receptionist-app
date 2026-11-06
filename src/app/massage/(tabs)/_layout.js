import { Tabs } from "expo-router/js-tabs";

import {
  CalendarDays,
  DoorOpen,
  Ellipsis,
  House,
  UsersRound,
} from "lucide-react-native";

import {
  colors,
  fonts,
} from "../../../theme";
import { t } from "../../../i18n";

// ======================================================
// Massage tabs
// ======================================================
//
// The bottom tab bar of a massage business:
// Vandaag · Agenda · Team · Kamers · Meer.
//
// Klanten is opened from Meer.
// ======================================================

function tabIcon(Icon) {
  return function TabIcon({ color }) {
    return (
      <Icon
        color={color}
        size={24}
        strokeWidth={1.8}
      />
    );
  };
}

export default function MassageTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t("tabs.today"),
          tabBarIcon: tabIcon(House),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: t("tabs.agenda"),
          tabBarIcon: tabIcon(CalendarDays),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: t("tabs.team"),
          tabBarIcon: tabIcon(UsersRound),
        }}
      />
      <Tabs.Screen
        name="live-rooms"
        options={{
          title: t("tabs.rooms"),
          tabBarIcon: tabIcon(DoorOpen),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t("tabs.more"),
          tabBarIcon: tabIcon(Ellipsis),
        }}
      />
    </Tabs>
  );
}
