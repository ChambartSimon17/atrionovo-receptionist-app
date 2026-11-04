import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Copy, Plus, Trash2 } from "lucide-react-native";

import { api } from "../../services/api";
import { useAuth } from "../../context/auth-context";
import {
  Button,
  ScreenHeader,
  Sheet,
  SkeletonList,
  Switch,
} from "../../components/ui";
import TimePicker, { formatMinutes } from "../../components/ui/TimePicker";
import { t } from "../../i18n";
import { colors, fonts, radius, spacing } from "../../theme";
import { BUSINESS_TYPES } from "../../utils/business-type";

// ======================================================
// Opening hours
// ======================================================
//
// One row per day with a switch for open or closed. An
// open day shows its periods as time pills; tapping a
// pill opens a sheet with the opening and closing time.
// "+ periode" adds a second period (lunch and dinner).
// The first open day can be copied to every other day.
//
// The AI receptionist only books inside these hours.
// ======================================================

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DEFAULT_PERIOD = { opens: 12 * 60, closes: 22 * 60 };

function emptySchedule() {
  return Object.fromEntries(DAYS.map((day) => [day, []]));
}

function sortPeriods(periods) {
  return [...periods].sort((a, b) => a.opens - b.opens);
}

function overlaps(periods) {
  const sorted = sortPeriods(periods);

  return sorted.some(
    (period, index) => index > 0 && period.opens < sorted[index - 1].closes
  );
}

export default function OpeningHoursScreen() {
  const { accessToken, business, businessType } = useAuth();

  const isMassage = businessType === BUSINESS_TYPES.MASSAGE;

  const [schedule, setSchedule] = useState(emptySchedule);
  const [savedSchedule, setSavedSchedule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // { day, index, opens, closes } while the sheet is open.
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.getOpeningHours(business.id, accessToken);
      const openingHours = response?.data ?? response ?? [];

      const next = emptySchedule();

      openingHours.forEach((openingHour) => {
        next[openingHour.dayOfWeek]?.push({
          opens: openingHour.opensAtMinutes,
          closes: openingHour.closesAtMinutes,
        });
      });

      DAYS.forEach((day) => {
        next[day] = sortPeriods(next[day]);
      });

      setSchedule(next);
      setSavedSchedule(next);
    } catch (error) {
      Alert.alert(t("common.error"), error?.message || t("hours.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, business?.id]);

  useEffect(() => {
    if (business?.id) {
      load();
    }
  }, [business?.id, load]);

  const isDirty =
    savedSchedule && JSON.stringify(schedule) !== JSON.stringify(savedSchedule);

  function setDay(day, periods) {
    setSchedule((current) => ({ ...current, [day]: sortPeriods(periods) }));
  }

  function toggleDay(day, open) {
    setDay(day, open ? [DEFAULT_PERIOD] : []);
  }

  function addPeriod(day) {
    const periods = schedule[day];
    const last = periods[periods.length - 1];

    const opens = last ? Math.min(last.closes + 60, 23 * 60) : DEFAULT_PERIOD.opens;
    const closes = Math.min(opens + 4 * 60, 23 * 60 + 45);

    setEditing({ day, index: periods.length, opens, closes, isNew: true });
  }

  function saveEditing() {
    const { day, index, opens, closes } = editing;

    if (opens >= closes) {
      Alert.alert(t("hours.invalid"), t("hours.closesAfterOpens"));
      return;
    }

    const periods = [...schedule[day]];
    periods[index] = { opens, closes };

    if (overlaps(periods)) {
      Alert.alert(t("hours.invalid"), t("hours.overlap"));
      return;
    }

    setDay(day, periods);
    setEditing(null);
  }

  function removeEditing() {
    const { day, index } = editing;

    setDay(
      day,
      schedule[day].filter((_, periodIndex) => periodIndex !== index)
    );
    setEditing(null);
  }

  const copySource = DAYS.find((day) => schedule[day].length > 0);

  function copyToAll() {
    Alert.alert(
      t("hours.copyTitle", { day: t(`days.${copySource}`) }),
      t("hours.copyMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("hours.copyConfirm"),
          onPress: () =>
            setSchedule((current) =>
              Object.fromEntries(
                DAYS.map((day) => [
                  day,
                  current[day].length > 0 || day === copySource
                    ? current[copySource]
                    : current[day],
                ])
              )
            ),
        },
      ]
    );
  }

  async function handleSave() {
    const openingHours = DAYS.flatMap((day) =>
      schedule[day].map((period) => ({
        dayOfWeek: day,
        opensAtMinutes: period.opens,
        closesAtMinutes: period.closes,
      }))
    );

    try {
      setIsSaving(true);
      await api.updateOpeningHours(business.id, openingHours, accessToken);
      setSavedSchedule(schedule);
    } catch (error) {
      Alert.alert(t("common.error"), error?.message || t("hours.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <ScreenHeader title={isMassage ? t("hours.titleMassage") : t("hours.title")} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>{t("hours.description")}</Text>

        {isLoading ? (
          <SkeletonList rows={7} />
        ) : (
          <View style={styles.card}>
            {DAYS.map((day, dayIndex) => {
              const periods = schedule[day];
              const open = periods.length > 0;

              return (
                <View
                  key={day}
                  style={[styles.day, dayIndex > 0 && styles.dayDivider]}
                >
                  <View style={styles.dayText}>
                    <Text style={styles.dayName}>{t(`days.${day}`)}</Text>

                    {open ? (
                      <View style={styles.pills}>
                        {periods.map((period, index) => (
                          <Pressable
                            key={`${period.opens}-${index}`}
                            accessibilityRole="button"
                            accessibilityHint={t("hours.editHint")}
                            onPress={() =>
                              setEditing({ day, index, ...period })
                            }
                            style={({ pressed }) => [
                              styles.pill,
                              pressed && styles.pillPressed,
                            ]}
                          >
                            <Text style={styles.pillText}>
                              {formatMinutes(period.opens)} – {formatMinutes(period.closes)}
                            </Text>
                          </Pressable>
                        ))}

                        {periods.length < 3 ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => addPeriod(day)}
                            style={({ pressed }) => [
                              styles.addPill,
                              pressed && styles.pillPressed,
                            ]}
                          >
                            <Plus size={13} color={colors.primary} strokeWidth={2.2} />
                            <Text style={styles.addPillText}>{t("hours.period")}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.closed}>{t("hours.closed")}</Text>
                    )}
                  </View>

                  <Switch value={open} onValueChange={(next) => toggleDay(day, next)} />
                </View>
              );
            })}
          </View>
        )}

        {!isLoading && copySource ? (
          <Pressable
            accessibilityRole="button"
            onPress={copyToAll}
            style={({ pressed }) => [styles.copy, pressed && styles.copyPressed]}
          >
            <Copy size={15} color={colors.primary} strokeWidth={2} />
            <Text style={styles.copyText}>
              {t("hours.copy", { day: t(`days.${copySource}`) })}
            </Text>
          </Pressable>
        ) : null}

        <Button
          variant="primary"
          label={isDirty ? t("common.save") : t("common.saved")}
          onPress={handleSave}
          loading={isSaving}
          disabled={!isDirty}
          style={styles.save}
        />
      </ScrollView>

      <Sheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? t(`days.${editing.day}`) : ""}
        footer={
          editing ? (
            <>
              <Button variant="primary" label={t("common.done")} onPress={saveEditing} />
              {!editing.isNew ? (
                <Button
                  variant="danger"
                  label={t("hours.removePeriod")}
                  icon={<Trash2 size={16} color={colors.danger} strokeWidth={2} />}
                  onPress={removeEditing}
                />
              ) : null}
            </>
          ) : null
        }
      >
        {editing ? (
          <View style={styles.sheetBody}>
            <Text style={styles.sheetLabel}>{t("hours.opens")}</Text>
            <TimePicker
              value={editing.opens}
              onChange={(opens) => setEditing((current) => ({ ...current, opens }))}
            />
            <Text style={[styles.sheetLabel, styles.sheetLabelGap]}>
              {t("hours.closes")}
            </Text>
            <TimePicker
              value={editing.closes}
              onChange={(closes) => setEditing((current) => ({ ...current, closes }))}
            />
          </View>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },

  description: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.xs,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },

  day: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  dayDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  dayText: {
    flex: 1,
  },

  dayName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    lineHeight: 30,
  },

  closed: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },

  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 2,
  },

  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },

  pillPressed: {
    opacity: 0.7,
  },

  pillText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },

  addPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primaryBorder,
  },

  addPillText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },

  copy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },

  copyPressed: {
    opacity: 0.6,
  },

  copyText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.primary,
  },

  save: {
    marginTop: spacing.sm,
  },

  sheetBody: {
    paddingBottom: spacing.sm,
  },

  sheetLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  sheetLabelGap: {
    marginTop: spacing.lg,
  },
});
