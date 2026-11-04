import { Tabs } from "expo-router/js-tabs";

import {
  CalendarRange,
  Ellipsis,
  House,
  LayoutGrid,
  Users,
} from "lucide-react-native";

import {
  colors,
  fonts,
} from "../../theme";

// ======================================================
// Restaurant tabs
// ======================================================
//
// The bottom tab bar of a restaurant:
// Vandaag · Zaal · Agenda · Gasten · Meer.
//
// The group does not change the URLs, so /dashboard and
// /customers stay what they were.
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

export default function RestaurantTabsLayout() {
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
          title: "Vandaag",
          tabBarIcon: tabIcon(House),
        }}
      />
      <Tabs.Screen
        name="floor"
        options={{
          title: "Zaal",
          tabBarIcon: tabIcon(LayoutGrid),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: "Agenda",
          tabBarIcon: tabIcon(CalendarRange),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Gasten",
          tabBarIcon: tabIcon(Users),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Meer",
          tabBarIcon: tabIcon(Ellipsis),
        }}
      />
    </Tabs>
  );
}
