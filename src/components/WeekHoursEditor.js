import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { colors, fonts, spacing } from "../theme";
import { settingsStyles, switchColors } from "../theme/settingsStyles";
import { DAYS } from "../utils/time";

// ======================================================
// Week hours editor
// ======================================================
//
// One row per weekday with a switch and one or more
// periods "09:00 tot 17:00". Edits a week as made by
// createEmptyWeek / workingHoursToWeek in utils/time.js:
//
//   { MONDAY: [{ start: "09:00", end: "17:00" }], ... }
//
//   <WeekHoursEditor week={week} onChange={setWeek}
//                    onLabel="Open" offLabel="Gesloten" />
// ======================================================

export default function WeekHoursEditor({
  week,
  onChange,
  onLabel = "Open",
  offLabel = "Gesloten",
}) {
  function setDay(dayKey, periods) {
    onChange({ ...week, [dayKey]: periods });
  }

  function updatePeriod(dayKey, index, field, value) {
    setDay(
      dayKey,
      week[dayKey].map((period, i) =>
        i === index ? { ...period, [field]: value } : period
      )
    );
  }

  return DAYS.map((day) => {
    const periods = week[day.key];
    const isOpen = periods.length > 0;

    return (
      <View key={day.key} style={styles.day}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{day.label}</Text>

          <View style={styles.dayToggle}>
            <Text style={styles.dayState}>{isOpen ? onLabel : offLabel}</Text>

            <Switch
              {...switchColors}
              value={isOpen}
              onValueChange={(value) =>
                setDay(day.key, value ? [{ start: "09:00", end: "17:00" }] : [])
              }
            />
          </View>
        </View>

        {periods.map((period, index) => (
          <View key={index} style={styles.periodRow}>
            <TextInput
              style={[styles.input, styles.timeInput]}
              value={period.start}
              onChangeText={(value) => updatePeriod(day.key, index, "start", value)}
              placeholder="09:00"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={styles.until}>tot</Text>

            <TextInput
              style={[styles.input, styles.timeInput]}
              value={period.end}
              onChangeText={(value) => updatePeriod(day.key, index, "end", value)}
              placeholder="17:00"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Pressable
              onPress={() =>
                setDay(
                  day.key,
                  periods.filter((_, i) => i !== index)
                )
              }
            >
              <Text style={styles.dangerLink}>Verwijder</Text>
            </Pressable>
          </View>
        ))}

        {isOpen && (
          <Pressable
            onPress={() =>
              setDay(day.key, [...periods, { start: "13:00", end: "17:00" }])
            }
          >
            <Text style={styles.addPeriodLink}>+ Periode toevoegen</Text>
          </Pressable>
        )}
      </View>
    );
  });
}

const styles = StyleSheet.create({
  input: settingsStyles.input,
  dangerLink: settingsStyles.dangerLink,

  day: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dayTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },

  dayToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  dayState: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },

  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm + 2,
  },

  timeInput: {
    width: 84,
    textAlign: "center",
  },

  until: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },

  addPeriodLink: {
    ...settingsStyles.link,
    marginTop: spacing.sm,
  },
});
