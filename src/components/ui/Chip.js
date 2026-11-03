import {
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

import {
  colors,
  fonts,
  radius,
  spacing,
} from "../../theme";

// ======================================================
// Chip
// ======================================================
//
// A pill you can select, used for filters and choices
// such as "Alle", "Vrij" or a therapist's name.
// ======================================================

export default function Chip({
  label,
  selected = false,
  onPress,
  disabled = false,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        pressed && !selected && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          selected && styles.selectedLabel,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 36,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  unselected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },
  selectedLabel: {
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
  disabledLabel: {
    color: colors.textDisabled,
  },
});
