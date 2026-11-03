import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  colors,
  fonts,
  radius,
  spacing,
  touchTarget,
} from "../../theme";

// ======================================================
// Button
// ======================================================
//
// variant:
// - "primary"   filled green, one per screen
// - "secondary" white with a border (the default)
// - "ghost"     text only
// - "danger"    white with red text
//
// icon is an optional element shown before the label.
// ======================================================

export default function Button({
  label,
  onPress,
  variant = "secondary",
  icon,
  loading = false,
  disabled = false,
  style,
}) {
  const variantStyle = VARIANTS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variantStyle.container,
        pressed && variantStyle.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text.color} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, variantStyle.text]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS = {
  primary: {
    container: { backgroundColor: colors.primary },
    pressed: { backgroundColor: colors.primaryPressed },
    text: { color: colors.onPrimary },
  },
  secondary: {
    container: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: { backgroundColor: colors.surfaceMuted },
    text: { color: colors.text },
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    pressed: { backgroundColor: colors.surfaceMuted },
    text: { color: colors.primary },
  },
  danger: {
    container: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: { backgroundColor: colors.dangerSoft },
    text: { color: colors.danger },
  },
};

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
});
