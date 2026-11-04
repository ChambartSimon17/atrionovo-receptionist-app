import { Tabs } from "expo-router/js-tabs";

import {
  CalendarDays,
  DoorOpen,
  Ellipsis,
  House,
  Users,
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
// Vandaag · Agenda · Kamers · Klanten · Meer.
//
// Agenda, Kamers, Klanten and Meer show the existing
// screens for now; they get their new design next.
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
        name="live-rooms"
        options={{
          title: t("tabs.rooms"),
          tabBarIcon: tabIcon(DoorOpen),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: t("tabs.clients"),
          tabBarIcon: tabIcon(Users),
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
