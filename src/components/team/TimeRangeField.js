import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import TimePicker from "../ui/TimePicker";
import { t } from "../../i18n";
import { colors, fonts, radius, spacing } from "../../theme";
import { formatMinutes } from "./team-format";

// ======================================================
// TimeRangeField
// ======================================================
//
// "Van 10:00  Tot 18:00": tap a time to pick it below.
// value: { startMinutes, endMinutes }.
// ======================================================

export default function TimeRangeField({ value, onChange, fromLabel, toLabel }) {
  const [editing, setEditing] = useState(null);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Field
          label={fromLabel ?? t("team.from")}
          value={formatMinutes(value.startMinutes)}
          active={editing === "start"}
          onPress={() => setEditing(editing === "start" ? null : "start")}
        />
        <Field
          label={toLabel ?? t("team.to")}
          value={formatMinutes(value.endMinutes)}
          active={editing === "end"}
          onPress={() => setEditing(editing === "end" ? null : "end")}
        />
      </View>

      {editing ? (
        <TimePicker
          key={editing}
          value={editing === "start" ? value.startMinutes : value.endMinutes}
          onChange={(minutes) =>
            onChange(
              editing === "start"
                ? { ...value, startMinutes: minutes }
                : { ...value, endMinutes: minutes }
            )
          }
        />
      ) : null}
    </View>
  );
}

function Field({ label, value, active, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.field, active && styles.fieldActive]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, active && styles.valueActive]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },

  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  field: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  fieldActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },

  label: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },

  value: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
    marginTop: 2,
  },

  valueActive: {
    color: colors.primary,
  },
});
