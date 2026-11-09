import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, Clock, KeyRound } from "lucide-react-native";
import Columns from "../../../components/ui/Columns";
import useWideLayout from "../../../hooks/useWideLayout";

import { useAuth } from "../../../context/auth-context";
import { api } from "../../../services/api";
import { Button, Card } from "../../../components/ui";
import Avatar from "../../../components/team/Avatar";
import { locale, plural, t } from "../../../i18n";
import { colors, fonts, radius, spacing, type } from "../../../theme";
import { todayString } from "../../../utils/date";
import {
  dayColors,
  dayCount,
  formatClock,
  formatDateRange,
  formatPeriods,
  formatWorked,
  fromKey,
  reasonLabel,
} from "../../../components/team/team-format";

// ======================================================
// Therapist (Team → name)
// ======================================================
//
// One therapist: the usual week, the coming changes and
// absences, what they worked this month, and their time
// clock PIN (the owner can reset it).
// ======================================================

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function TherapistScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { business, accessToken } = useAuth();

  const [therapist, setTherapist] = useState(null);
  const wide = useWideLayout();
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.getTeamTherapist(business.id, id, todayString(), accessToken);

      setTherapist(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [business?.id, id, accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function resetPin() {
    Alert.alert(t("team.resetPin"), t("team.resetPinConfirm", { name: therapist.name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("team.resetPin"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.resetClockPin(business.id, therapist.id, accessToken);
            load();
          } catch (resetError) {
            Alert.alert(t("common.error"), resetError.message);
          }
        },
      },
    ]);
  }

  if (!therapist) {
    return (
      <SafeAreaView style={styles.screen} edges={[]}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator style={styles.loading} />}
      </SafeAreaView>
    );
  }

  const changes = [
    ...therapist.scheduleDays.map((day) => ({ kind: "day", date: day.date, day })),
    ...therapist.absences.map((absence) => ({ kind: "absence", date: absence.startDate, absence })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <ScrollView contentContainerStyle={[styles.content, wide && styles.contentWide]} showsVerticalScrollIndicator={false}>
        <Columns
          gap={spacing.sm}
          left={
            <>
              <View style={styles.header}>
                <Avatar name={therapist.name} size={52} />
                <Text style={type.title}>{therapist.name}</Text>
              </View>

              {/* Usual week */}

              <Text style={styles.label}>{t("team.weekly")}</Text>
              <Card style={styles.list}>
                {DAYS.map((day, index) => {
                  const periods = therapist.workingHours.filter((period) => period.dayOfWeek === day);

                  return (
                    <View key={day} style={[styles.row, index > 0 && styles.divider]}>
                      <Text style={[type.body, styles.dayName]}>{t(`days.${day}`)}</Text>
                      <Text style={periods.length ? type.bodyMedium : styles.off}>
                        {periods.length ? formatPeriods(periods) : t("team.off")}
                      </Text>
                    </View>
                  );
                })}
              </Card>
              <Button label={t("team.editWeekly")} onPress={() => router.push("/massage/therapists")} />

              {/* Changes and absences */}

              <Text style={styles.label}>{t("team.changes")}</Text>
              {changes.length === 0 ? (
                <Text style={type.caption}>{t("team.noChanges")}</Text>
              ) : (
                <Card style={styles.list}>
                  {changes.map((change, index) => {
                    const date = fromKey(change.date);
                    const palette =
                      change.kind === "absence" ? dayColors[change.absence.reason] : dayColors.work;

                    return (
                      <Pressable
                        key={`${change.kind}-${change.date}-${index}`}
                        accessibilityRole="button"
                        disabled={change.kind !== "absence"}
                        onPress={() => router.push(`/massage/team/absence/${change.absence.id}`)}
                        style={[styles.row, index > 0 && styles.divider]}
                      >
                        <View style={[styles.dateBox, { backgroundColor: palette.background }]}>
                          <Text style={[styles.dateMonth, { color: palette.text }]}>
                            {date.toLocaleDateString(locale, { month: "short" }).replace(".", "").toUpperCase()}
                          </Text>
                          <Text style={[styles.dateDay, { color: palette.text }]}>{date.getDate()}</Text>
                        </View>
                        <View style={styles.rowText}>
                          {change.kind === "absence" ? (
                            <>
                              <Text style={type.bodyMedium}>{reasonLabel(change.absence.reason)}</Text>
                              <Text style={type.caption}>
                                {[
                                  formatDateRange(change.absence.startDate, change.absence.endDate),
                                  plural(
                                    "team.dayCount",
                                    dayCount(change.absence.startDate, change.absence.endDate)
                                  ),
                                  change.absence.note,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text style={type.bodyMedium}>
                                {change.day.periods.length ? t("team.customHours") : t("team.dayOff")}
                              </Text>
                              <Text style={type.caption}>
                                {[
                                  change.day.periods.length ? formatPeriods(change.day.periods) : null,
                                  change.day.weekly.length
                                    ? t("team.insteadOf", { hours: formatPeriods(change.day.weekly) })
                                    : t("team.insteadOfOff"),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </Text>
                            </>
                          )}
                        </View>
                        {change.kind === "absence" ? (
                          <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.8} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </Card>
              )}

            </>
          }
          right={
            <>
              {/* This month */}

              <Text style={styles.label}>{t("team.thisMonth")}</Text>
              <Card style={styles.month}>
                <View style={styles.monthItem}>
                  <Text style={styles.monthValue}>{formatWorked(therapist.month.workedMinutes)}</Text>
                  <Text style={type.caption}>{t("team.worked")}</Text>
                </View>
                <View style={styles.monthItem}>
                  <Text style={styles.monthValue}>{therapist.month.appointmentCount}</Text>
                  <Text style={type.caption}>{t("team.massages")}</Text>
                </View>
              </Card>

              {/* Time clock */}

              <Text style={styles.label}>{t("team.clock")}</Text>
              <Card style={styles.list}>
                <View style={styles.row}>
                  <KeyRound size={18} color={colors.textMuted} strokeWidth={1.8} />
                  <Text style={[type.body, styles.rowText]}>{t("team.pin")}</Text>
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: therapist.hasPin ? colors.primarySoft : colors.warningSoft },
                    ]}
                  >
                    <Text
                      style={[styles.chipText, { color: therapist.hasPin ? colors.primary : colors.warning }]}
                    >
                      {therapist.hasPin ? t("team.pinSet") : t("team.pinNotSet")}
                    </Text>
                  </View>
                </View>
                {therapist.lastEntry ? (
                  <View style={[styles.row, styles.divider]}>
                    <Clock size={18} color={colors.textMuted} strokeWidth={1.8} />
                    <Text style={[type.body, styles.rowText]}>{t("team.lastEntry")}</Text>
                    <Text style={type.caption}>
                      {therapist.lastEntry.clockOutAt
                        ? t("team.lastOut", { time: lastLabel(therapist.lastEntry.clockOutAt) })
                        : t("team.lastIn", { time: lastLabel(therapist.lastEntry.clockInAt) })}
                    </Text>
                  </View>
                ) : null}
                {therapist.hasPin ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={resetPin}
                    style={[styles.row, styles.divider]}
                  >
                    <Text style={styles.danger}>{t("team.resetPin")}</Text>
                  </Pressable>
                ) : null}
              </Card>
              <Text style={type.caption}>{t("team.pinHint")}</Text>
            </>
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function lastLabel(iso) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();

  return sameDay
    ? formatClock(iso)
    : `${date.toLocaleDateString(locale, { day: "numeric", month: "short" })} ${formatClock(iso)}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loading: {
    marginTop: spacing.xxl,
  },

  error: {
    margin: spacing.xl,
    fontFamily: fonts.regular,
    color: colors.danger,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
    gap: spacing.sm,
  },

  // Tablet in landscape: two columns

  contentWide: {
    maxWidth: 1180,
  },

  header: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginLeft: spacing.xs,
  },

  list: {
    paddingVertical: spacing.xs,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  dayName: {
    width: 100,
  },

  off: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textDisabled,
  },

  rowText: {
    flex: 1,
    gap: 2,
  },

  dateBox: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  dateMonth: {
    fontFamily: fonts.semibold,
    fontSize: 9,
  },

  dateDay: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },

  month: {
    flexDirection: "row",
    gap: spacing.lg,
  },

  monthItem: {
    flex: 1,
    gap: 2,
  },

  monthValue: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    color: colors.text,
  },

  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },

  danger: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.danger,
  },
});
