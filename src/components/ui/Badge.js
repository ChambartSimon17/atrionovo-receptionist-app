import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  colors,
  fonts,
  radius,
  statusColors,
} from "../../theme";

// ======================================================
// Badge
// ======================================================
//
// A small coloured label. Pass status (an appointment
// status such as "CONFIRMED") to use the shared status
// colours, or background and color for anything else.
// ======================================================

export default function Badge({
  label,
  status,
  background,
  color,
  style,
}) {
  const statusColor = status
    ? statusColors[status]
    : null;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor:
            background ??
            statusColor?.background ??
            colors.surfaceMuted,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color:
              color ??
              statusColor?.text ??
              colors.text,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
});
