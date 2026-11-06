import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button, SegmentedControl, Sheet } from "../ui";
import TimeRangeField from "./TimeRangeField";
import { locale, t } from "../../i18n";
import { colors, fonts, radius, spacing, type } from "../../theme";
import { formatPeriods, fromKey, reasonLabel } from "./team-format";

// ======================================================
// DaySheet
// ======================================================
//
// One therapist on one date: work other hours, take the
// day off, go back to the usual week, or report an
// absence. day is one entry of the week schedule:
// { date, periods, planned, source, absence }.
// ======================================================

const DEFAULT_PERIOD = { startMinutes: 600, endMinutes: 1080 };

export default function DaySheet({
  visible,
  therapist,
  day,
  onClose,
  onSave,
  onReset,
  onReportAbsence,
  onOpenAbsence,
}) {
  const [mode, setMode] = useState("work");
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !day) {
      return;
    }

    const first = day.planned[0];

    setMode(day.planned.length > 0 ? "work" : "off");
    setPeriod(first ? { startMinutes: first.startMinutes, endMinutes: first.endMinutes } : DEFAULT_PERIOD);
  }, [visible, day]);

  if (!day || !therapist) {
    return null;
  }

  const title = `${therapist.name} · ${fromKey(day.date).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  })}`;

  async function save() {
    if (mode === "work" && period.startMinutes >= period.endMinutes) {
      Alert.alert(t("team.endAfterStart"));
      return;
    }

    setSaving(true);

    try {
      await onSave(mode === "work" ? [period] : []);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button label={t("common.save")} variant="primary" loading={saving} onPress={save} />
          {day.source === "CUSTOM" ? (
            <Button label={t("team.backToWeekly")} onPress={onReset} />
          ) : null}
          {day.absence ? (
            <Button
              label={t("team.absentThisDay", { reason: reasonLabel(day.absence.reason) })}
              onPress={onOpenAbsence}
            />
          ) : (
            <Button label={t("team.reportAbsence")} variant="ghost" onPress={onReportAbsence} />
          )}
        </>
      }
    >
      <View style={styles.body}>
        <Text style={type.caption}>
          {day.source === "CUSTOM"
            ? t("team.customHours")
            : day.planned.length > 0
              ? t("team.weeklyIs", { hours: formatPeriods(day.planned) })
              : t("team.weeklyNone")}
        </Text>

        {day.absence ? (
          <View style={styles.absence}>
            <Text style={styles.absenceText}>
              {t("team.absentThisDay", { reason: reasonLabel(day.absence.reason) })}
            </Text>
          </View>
        ) : null}

        <SegmentedControl
          options={[
            { value: "work", label: t("team.customHours") },
            { value: "off", label: t("team.dayOff") },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === "work" ? <TimeRangeField value={period} onChange={setPeriod} /> : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },

  absence: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },

  absenceText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.danger,
  },
});
