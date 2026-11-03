import {
  StyleSheet,
  Text,
} from "react-native";

import Card from "./Card";

import {
  colors,
  fonts,
} from "../../theme";

// ======================================================
// StatTile
// ======================================================
//
// One number with a label above and an optional note
// below, such as "Omzet vandaag · € 684 · +12%".
//
// trend: "up" colours the note green.
// ======================================================

export default function StatTile({
  label,
  value,
  note,
  trend,
  tone = "default",
  style,
}) {
  const onPrimary = tone === "primary";

  return (
    <Card tone={tone} style={[styles.tile, style]}>
      <Text
        style={[
          styles.label,
          onPrimary && styles.labelOnPrimary,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.value,
          onPrimary && styles.valueOnPrimary,
        ]}
      >
        {value}
      </Text>
      {note ? (
        <Text
          style={[
            styles.note,
            trend === "up" && styles.noteUp,
            onPrimary && styles.labelOnPrimary,
          ]}
        >
          {note}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  labelOnPrimary: {
    color: colors.onPrimaryMuted,
  },
  value: {
    fontFamily: fonts.semibold,
    fontSize: 26,
    color: colors.text,
  },
  valueOnPrimary: {
    color: colors.onPrimary,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  noteUp: {
    color: colors.positive,
  },
});
