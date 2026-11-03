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
} from "../../theme";

// ======================================================
// SegmentedControl
// ======================================================
//
// A row of equal buttons where exactly one is active, for
// example "Dag / Week / Maand".
//
// options: [{ value, label }]
// ======================================================

export default function SegmentedControl({
  options,
  value,
  onChange,
  style,
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, style]}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              active && styles.activeSegment,
            ]}
          >
            <Text
              style={[
                styles.label,
                active && styles.activeLabel,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: colors.segmentTrack,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: 34,
    borderRadius: radius.md - 2,
    alignItems: "center",
    justifyContent: "center",
  },
  activeSegment: {
    backgroundColor: colors.surface,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  activeLabel: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },
});
