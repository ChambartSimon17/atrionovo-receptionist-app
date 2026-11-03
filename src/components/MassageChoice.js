import {
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
} from "../theme";

// ======================================================
// MassageChoice
// ======================================================
//
// Lets the owner pick which massages a therapist can
// perform or which massages can take place in a room.
// The selected massages are highlighted.
// ======================================================

export default function MassageChoice({
  services,
  selectedIds,
  onChange,
}) {
  if (services.length === 0) {
    return (
      <Text style={styles.empty}>
        Je hebt nog geen massages. Voeg ze eerst toe
        bij "Massages en prijzen".
      </Text>
    );
  }

  function toggle(id) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id]
    );
  }

  return (
    <View style={styles.wrap}>
      {services.map((service) => {
        const selected = selectedIds.includes(
          service.id
        );

        return (
          <Pressable
            key={service.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            style={[
              styles.chip,
              selected && styles.chipSelected,
            ]}
            onPress={() => toggle(service.id)}
          >
            <Text
              style={[
                styles.chipText,
                selected && styles.chipTextSelected,
              ]}
            >
              {service.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  chip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  chipSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  chipText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },

  chipTextSelected: {
    fontFamily: fonts.semibold,
    color: colors.primary,
  },

  empty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
});
