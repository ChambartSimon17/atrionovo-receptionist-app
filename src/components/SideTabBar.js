import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";

import { useAuth } from "../context/auth-context";
import { colors, fonts, radius, spacing } from "../theme";

// ======================================================
// Side tab bar
// ======================================================
//
// In the browser on a laptop the tabs move from the
// bottom to a sidebar on the left, like a web app: logo,
// the business, and one row per tab with icon and name.
// On the phone and the iPad nothing changes.
//
//   const sidebar = useSideTabs();
//   <Tabs screenOptions={{ ...options, ...sidebar.screenOptions }}
//         tabBar={sidebar.tabBar} />
// ======================================================

const ICON = require("../../assets/images/icon.png");

const MIN_WIDTH = 1024;

export const SIDEBAR_WIDTH = 232;

export function useSideTabs() {
  const { width } = useWindowDimensions();

  if (Platform.OS !== "web" || width < MIN_WIDTH) {
    return { screenOptions: {}, tabBar: undefined };
  }

  return {
    screenOptions: { tabBarPosition: "left" },
    tabBar: (props) => <SideTabBar {...props} />,
  };
}

function SideTabBar({ state, descriptors, navigation }) {
  const { business } = useAuth();

  return (
    <View style={styles.bar}>
      <View style={styles.brand}>
        <Image source={ICON} style={styles.logo} />
        <View style={styles.brandText}>
          <Text style={styles.product}>AtrioNovo</Text>
          {business?.name ? (
            <Text style={styles.business} numberOfLines={1}>
              {business.name}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.items}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

          if (options.href === null) {
            return null;
          }

          const focused = state.index === index;
          const color = focused ? colors.primary : colors.textMuted;
          const label = options.title ?? route.name;

          function onPress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="link"
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              style={({ hovered }) => [
                styles.item,
                hovered && !focused && styles.itemHovered,
                focused && styles.itemFocused,
              ]}
            >
              {options.tabBarIcon?.({ focused, color, size: 20 })}
              <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },

  logo: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
  },

  brandText: {
    flex: 1,
    minWidth: 0,
  },

  product: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },

  business: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },

  items: {
    gap: 2,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
  },

  itemHovered: {
    backgroundColor: colors.surfaceMuted,
  },

  itemFocused: {
    backgroundColor: colors.primarySoft,
  },

  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },

  labelFocused: {
    color: colors.primary,
  },
});
