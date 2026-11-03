import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import {
  colors,
  radius,
  spacing,
} from "../../theme";

// ======================================================
// Card
// ======================================================
//
// A white rounded box with a thin border. With onPress it
// becomes tappable. tone="primary" gives the filled green
// card used for the main number of a screen.
// ======================================================

export default function Card({
  children,
  onPress,
  tone = "default",
  style,
}) {
  const toneStyle =
    tone === "primary" ? styles.primary : styles.default;

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.base,
          toneStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.base, toneStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    padding: spacing.md + 2,
  },
  default: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
});
