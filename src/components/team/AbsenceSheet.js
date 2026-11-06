import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { Button, Chip, SegmentedControl, Sheet } from "../ui";
import DateRangePicker from "../ui/DateRangePicker";
import TimeRangeField from "./TimeRangeField";
import { plural, t } from "../../i18n";
import { colors, fonts, radius, spacing } from "../../theme";
import { dayCount } from "./team-format";

// ======================================================
// AbsenceSheet
// ======================================================
//
// Report that a therapist is away: who, why (sick, leave,
// personal, training), from which day to which day, the
// whole day or part of it, and an optional note ("trouw").
//
// The owner always does this; therapists cannot report
// themselves. onSubmit(absence) saves it.
// ======================================================

const REASONS = ["SICK", "LEAVE", "PERSONAL", "TRAINING"];

export default function AbsenceSheet({ visible, therapists, initial, onClose, onSubmit }) {
  const [therapistId, setTherapistId] = useState(null);
  const [reason, setReason] = useState("SICK");
  const [range, setRange] = useState({ start: null, end: null });
  const [partial, setPartial] = useState(false);
  const [period, setPeriod] = useState({ startMinutes: 600, endMinutes: 780 });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setTherapistId(initial?.therapistId ?? null);
    setReason(initial?.reason ?? "SICK");
    setRange({ start: initial?.date ?? null, end: initial?.date ?? null });
    setPartial(false);
    setNote("");
  }, [visible, initial]);

  const therapist = therapists.find((item) => item.id === therapistId);
  const days = range.start && range.end ? dayCount(range.start, range.end) : 0;

  async function submit() {
    if (!therapist || !range.start) {
      Alert.alert(t("team.chooseTherapist"));
      return;
    }

    setSaving(true);

    try {
      await onSubmit({
        therapistId,
        reason,
        startDate: range.start,
        endDate: range.end ?? range.start,
        startMinutes: partial ? period.startMinutes : null,
        endMinutes: partial ? period.endMinutes : null,
        note: note.trim() || null,
      });
    } catch (error) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("team.reportAbsence")}
      footer={
        <Button
          variant="primary"
          loading={saving}
          disabled={!therapist || !range.start}
          label={
            therapist
              ? plural("team.setAbsent", days || 1, { name: therapist.name })
              : t("team.chooseTherapist")
          }
          onPress={submit}
        />
      }
    >
      <View style={styles.body}>
        <Text style={styles.label}>{t("team.who")}</Text>
        <View style={styles.chips}>
          {therapists.map((item) => (
            <Chip
              key={item.id}
              label={item.name}
              selected={item.id === therapistId}
              onPress={() => setTherapistId(item.id)}
            />
          ))}
        </View>

        <Text style={styles.label}>{t("team.reason")}</Text>
        <View style={styles.chips}>
          {REASONS.map((value) => (
            <Chip
              key={value}
              label={t(`team.reasons.${value}`)}
              selected={value === reason}
              onPress={() => setReason(value)}
            />
          ))}
        </View>

        <Text style={styles.label}>{t("team.when")}</Text>
        <DateRangePicker
          start={range.start}
          end={range.end}
          onChange={({ start, end }) => setRange({ start, end })}
        />

        <SegmentedControl
          options={[
            { value: "whole", label: t("team.wholeDay") },
            { value: "part", label: t("team.partOfDay") },
          ]}
          value={partial ? "part" : "whole"}
          onChange={(value) => setPartial(value === "part")}
        />

        {partial ? <TimeRangeField value={period} onChange={setPeriod} /> : null}

        <Text style={styles.label}>{t("team.note")}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t("team.notePlaceholder")}
          placeholderTextColor={colors.textDisabled}
          style={styles.input}
          maxLength={200}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },

  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  input: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
});
