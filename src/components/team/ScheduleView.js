import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import { Button, Card } from "../ui";
import Avatar from "./Avatar";
import DaySheet from "./DaySheet";
import AbsenceSheet from "./AbsenceSheet";
import { weekStart } from "../WeekStrip";
import { locale, plural, t } from "../../i18n";
import { colors, fonts, radius, spacing, type } from "../../theme";
import { addDays, todayString } from "../../utils/date";
import { dayColors, formatDateRange, fromKey, reasonLabel, shortHour } from "./team-format";

// ======================================================
// ScheduleView (Team → Rooster)
// ======================================================
//
// The week of every therapist on one grid: their hours,
// days off and absences. The usual week is the base; a
// tap on a day changes that date only. Below the grid the
// absences of the week, with a warning when appointments
// fall in them.
// ======================================================

export default function ScheduleView() {
  const router = useRouter();
  const { business, accessToken } = useAuth();

  const [monday, setMonday] = useState(() => weekStart(todayString()));
  const [week, setWeek] = useState(null);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [absenceDraft, setAbsenceDraft] = useState(null);

  const load = useCallback(async () => {
    if (!business?.id) {
      return;
    }

    try {
      const response = await api.getTeamSchedule(business.id, monday, 7, accessToken);

      setWeek(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [business?.id, monday, accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const today = todayString();
  const therapists = week?.therapists ?? [];
  const absences = week?.absences ?? [];
  const conflicts = absences.filter((absence) => absence.appointmentCount > 0);

  const title = `${fromKey(monday).getDate()} – ${fromKey(addDays(monday, 6)).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
  })}`;

  async function saveDay(periods) {
    try {
      await api.setScheduleDay(business.id, editing.therapist.id, editing.day.date, periods, accessToken);
      setEditing(null);
      load();
    } catch (saveError) {
      Alert.alert(t("common.error"), saveError.message);
    }
  }

  async function resetDay() {
    try {
      await api.clearScheduleDay(business.id, editing.therapist.id, editing.day.date, accessToken);
      setEditing(null);
      load();
    } catch (resetError) {
      Alert.alert(t("common.error"), resetError.message);
    }
  }

  async function createAbsence(absence) {
    const response = await api.createAbsence(business.id, absence, accessToken);

    setAbsenceDraft(null);
    load();

    if (response.data.conflicts.length > 0) {
      router.push(`/massage/team/absence/${response.data.absence.id}`);
    }
  }

  if (!week && !error) {
    return <ActivityIndicator style={styles.loading} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.weekHeader}>
        <ArrowButton label={t("calendar.previousWeek")} onPress={() => setMonday(addDays(monday, -7))}>
          <ChevronLeft size={18} color={colors.text} strokeWidth={1.8} />
        </ArrowButton>
        <Pressable
          accessibilityRole="button"
          onPress={() => setMonday(weekStart(today))}
          style={styles.weekTitleBox}
        >
          <Text style={styles.weekTitle}>{title}</Text>
          {monday !== weekStart(today) ? (
            <Text style={styles.weekHint}>{t("calendar.today")}</Text>
          ) : null}
        </Pressable>
        <ArrowButton label={t("calendar.nextWeek")} onPress={() => setMonday(addDays(monday, 7))}>
          <ChevronRight size={18} color={colors.text} strokeWidth={1.8} />
        </ArrowButton>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {therapists.length === 0 && !error ? (
        <Text style={type.caption}>{t("team.noTherapists")}</Text>
      ) : (
        <Card style={styles.grid}>
          <View style={styles.gridRow}>
            <View style={styles.nameCell} />
            {week.dates.map((date) => (
              <Text key={date} style={[styles.dayHead, date === today && styles.dayHeadToday]}>
                {fromKey(date)
                  .toLocaleDateString(locale, { weekday: "short" })
                  .replace(".", "")
                  .slice(0, 2)
                  .toUpperCase()}
                {"\n"}
                {fromKey(date).getDate()}
              </Text>
            ))}
          </View>

          {therapists.map((therapist, index) => (
            <View key={therapist.id} style={styles.gridRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/massage/team/${therapist.id}`)}
                style={styles.nameCell}
              >
                <Avatar name={therapist.name} index={index} size={24} />
                <Text style={styles.name} numberOfLines={1}>
                  {therapist.name}
                </Text>
              </Pressable>

              {therapist.days.map((day) => (
                <DayCell
                  key={day.date}
                  day={day}
                  onPress={() => setEditing({ therapist, day })}
                />
              ))}
            </View>
          ))}
        </Card>
      )}

      <Text style={type.caption}>{t("team.tapHint")}</Text>

      {conflicts.map((absence) => (
        <Pressable
          key={`c-${absence.id}`}
          accessibilityRole="button"
          onPress={() => router.push(`/massage/team/absence/${absence.id}`)}
          style={styles.warning}
        >
          <AlertTriangle size={18} color={colors.warning} strokeWidth={1.8} />
          <Text style={styles.warningText}>
            {plural("team.appointmentsInAbsence", absence.appointmentCount, {
              name: absence.therapistName,
            })}
          </Text>
          <Text style={styles.warningAction}>{t("team.replan")}</Text>
        </Pressable>
      ))}

      <View style={styles.section}>
        <Text style={type.heading}>{t("team.absences")}</Text>

        {absences.length === 0 ? (
          <Text style={type.caption}>{t("team.noAbsences")}</Text>
        ) : (
          <Card style={styles.list}>
            {absences.map((absence, index) => {
              const palette = dayColors[absence.reason];

              return (
                <Pressable
                  key={absence.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/massage/team/absence/${absence.id}`)}
                  style={[styles.absenceRow, index > 0 && styles.divider]}
                >
                  <View style={[styles.reasonChip, { backgroundColor: palette.background }]}>
                    <Text style={[styles.reasonText, { color: palette.text }]}>
                      {reasonLabel(absence.reason)}
                    </Text>
                  </View>
                  <View style={styles.absenceText}>
                    <Text style={type.bodyMedium}>
                      {absence.therapistName} · {formatDateRange(absence.startDate, absence.endDate)}
                    </Text>
                    {absence.note || absence.appointmentCount > 0 ? (
                      <Text style={type.caption}>
                        {[
                          absence.note,
                          absence.appointmentCount > 0
                            ? plural("team.appointmentCount", absence.appointmentCount)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.8} />
                </Pressable>
              );
            })}
          </Card>
        )}

        <Button
          label={t("team.reportAbsence")}
          icon={<Plus size={18} color={colors.text} strokeWidth={2} />}
          onPress={() => setAbsenceDraft({ date: today < monday ? monday : today })}
        />
      </View>

      <DaySheet
        visible={!!editing}
        therapist={editing?.therapist}
        day={editing?.day}
        onClose={() => setEditing(null)}
        onSave={saveDay}
        onReset={resetDay}
        onReportAbsence={() => {
          const draft = { therapistId: editing.therapist.id, date: editing.day.date };

          setEditing(null);
          setAbsenceDraft(draft);
        }}
        onOpenAbsence={() => {
          const id = editing.day.absence.id;

          setEditing(null);
          router.push(`/massage/team/absence/${id}`);
        }}
      />

      <AbsenceSheet
        visible={!!absenceDraft}
        therapists={therapists}
        initial={absenceDraft}
        onClose={() => setAbsenceDraft(null)}
        onSubmit={createAbsence}
      />
    </View>
  );
}

function DayCell({ day, onPress }) {
  let palette;
  let lines;

  if (day.absence && day.periods.length === 0) {
    palette = dayColors[day.absence.reason];
    lines = [reasonLabel(day.absence.reason)];
  } else if (day.periods.length === 0) {
    palette = dayColors.off;
    lines = ["–"];
  } else {
    palette = day.source === "CUSTOM" ? dayColors.custom : dayColors.work;
    lines = [
      shortHour(day.periods[0].startMinutes),
      shortHour(day.periods[day.periods.length - 1].endMinutes),
    ];

    if (day.absence) {
      palette = dayColors[day.absence.reason];
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={lines.join(" – ")}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        { backgroundColor: palette.background },
        palette.border && { borderWidth: 1, borderColor: palette.border, borderStyle: day.periods.length ? "solid" : "dashed" },
        pressed && styles.cellPressed,
      ]}
    >
      {lines.map((line, index) => (
        <Text
          key={index}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.cellText, { color: palette.text }]}
        >
          {line}
        </Text>
      ))}
    </Pressable>
  );
}

function ArrowButton({ label, onPress, children }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginVertical: spacing.xxl,
  },

  container: {
    gap: spacing.md,
  },

  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  weekTitleBox: {
    flex: 1,
    alignItems: "center",
  },

  weekTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },

  weekHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },

  arrow: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  arrowPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  error: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.danger,
  },

  grid: {
    padding: spacing.sm,
    gap: 4,
  },

  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  nameCell: {
    width: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
  },

  name: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.text,
  },

  dayHead: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    paddingBottom: 2,
  },

  dayHeadToday: {
    color: colors.primary,
  },

  cell: {
    flex: 1,
    minHeight: 40,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 1,
  },

  cellPressed: {
    opacity: 0.7,
  },

  cellText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
  },

  warning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },

  warningText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.warning,
  },

  warningAction: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.warning,
    textDecorationLine: "underline",
  },

  section: {
    gap: 10,
    marginTop: spacing.sm,
  },

  list: {
    paddingVertical: spacing.xs,
  },

  absenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  reasonChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  reasonText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },

  absenceText: {
    flex: 1,
    gap: 2,
  },
});
