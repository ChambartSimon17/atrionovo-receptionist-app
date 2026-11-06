import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { ChevronRight, Download, Lock } from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import { Button, Card, SegmentedControl } from "../ui";
import Avatar from "./Avatar";
import EntrySheet from "./EntrySheet";
import { weekStart } from "../WeekStrip";
import { plural, t } from "../../i18n";
import { colors, fonts, radius, spacing, type } from "../../theme";
import { addDays, todayString } from "../../utils/date";
import { attendanceColors, formatClock, formatMinutes, formatWorked } from "./team-format";

// ======================================================
// AttendanceView (Team → Aanwezigheid)
// ======================================================
//
// Vandaag: who clocked in when, compared with the
// schedule (on time, late, didn't come), with the photos
// of the time clock. Tap someone to correct their times.
//
// Week and Maand: worked against planned hours per
// therapist, and the export for the payroll.
//
// "Dit toestel als prikklok gebruiken" turns this device
// into the time clock at the counter.
// ======================================================

function monthRange(today) {
  const from = `${today.slice(0, 7)}-01`;
  const [year, month] = today.split("-").map(Number);
  const last = new Date(year, month, 0).getDate();

  return { from, to: `${today.slice(0, 7)}-${String(last).padStart(2, "0")}` };
}

export default function AttendanceView() {
  const router = useRouter();
  const { business, accessToken } = useAuth();

  const [period, setPeriod] = useState("today");
  const [day, setDay] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const today = todayString();

  const range =
    period === "week"
      ? { from: weekStart(today), to: addDays(weekStart(today), 6) }
      : monthRange(today);

  const load = useCallback(async () => {
    if (!business?.id) {
      return;
    }

    try {
      if (period === "today") {
        const response = await api.getAttendance(business.id, today, accessToken);

        setDay(response.data);
      } else {
        const response = await api.getAttendanceSummary(business.id, range.from, range.to, accessToken);

        setSummary(response.data);
      }

      setError(null);
    } catch (loadError) {
      setError(loadError.message);
    }
    // range follows period and today.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id, accessToken, period, today]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function exportCsv() {
    setExporting(true);

    try {
      const csv = await api.getAttendanceCsv(business.id, range.from, range.to, accessToken);
      const file = new File(Paths.cache, `uren-${range.from}-${range.to}.csv`);

      if (file.exists) {
        file.delete();
      }

      file.create();
      file.write(csv);

      await Sharing.shareAsync(file.uri, { mimeType: "text/csv", UTI: "public.comma-separated-values-text" });
    } catch (exportError) {
      Alert.alert(t("common.error"), exportError.message);
    } finally {
      setExporting(false);
    }
  }

  const rows = day?.therapists ?? [];
  const editing = rows.find((row) => row.id === editingId);

  const photos = rows.flatMap((row) =>
    row.entries.flatMap((entry) => [
      ...(entry.hasInPhoto ? [{ key: `${entry.id}-in`, entry, kind: "in", name: row.name, at: entry.clockInAt }] : []),
      ...(entry.hasOutPhoto
        ? [{ key: `${entry.id}-out`, entry, kind: "out", name: row.name, at: entry.clockOutAt }]
        : []),
    ])
  );

  return (
    <View style={styles.container}>
      <SegmentedControl
        options={[
          { value: "today", label: t("attendance.today") },
          { value: "week", label: t("attendance.week") },
          { value: "month", label: t("attendance.month") },
        ]}
        value={period}
        onChange={setPeriod}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {period === "today" ? (
        !day ? (
          <ActivityIndicator style={styles.loading} />
        ) : (
          <>
            <Card style={styles.list}>
              {rows.map((row, index) => {
                const palette = attendanceColors[row.status];
                const first = row.entries[0];
                const last = row.entries[row.entries.length - 1];

                return (
                  <Pressable
                    key={row.id}
                    accessibilityRole="button"
                    onPress={() => setEditingId(row.id)}
                    style={[styles.row, index > 0 && styles.divider]}
                  >
                    <Avatar name={row.name} index={index} />
                    <View style={styles.rowText}>
                      <Text style={type.bodyMedium}>{row.name}</Text>
                      <Text style={type.caption}>
                        {[
                          first ? t("attendance.in", { time: formatClock(first.clockInAt) }) : null,
                          last?.clockOutAt ? t("attendance.out", { time: formatClock(last.clockOutAt) }) : null,
                          row.periods.length
                            ? t("attendance.planned", { time: formatMinutes(row.periods[0].startMinutes) })
                            : row.absence
                              ? t(`team.reasons.${row.absence.reason}`)
                              : t("attendance.notPlanned"),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                    <View style={[styles.status, { backgroundColor: palette.background }]}>
                      <Text style={[styles.statusText, { color: palette.text }]}>
                        {t(`attendance.status.${row.status}`, { minutes: row.lateMinutes })}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </Card>

            {photos.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.label}>{t("attendance.photos")}</Text>
                <View style={styles.photos}>
                  {photos.map((photo) => (
                    <View key={photo.key} style={styles.photo}>
                      <Image
                        source={api.clockPhotoSource(business.id, photo.entry.id, photo.kind, accessToken)}
                        style={styles.photoImage}
                        contentFit="cover"
                      />
                      <Text style={styles.photoCaption} numberOfLines={1}>
                        {photo.name} ·{" "}
                        {t(photo.kind === "in" ? "attendance.in" : "attendance.out", {
                          time: formatClock(photo.at),
                        })}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={type.caption}>{t("attendance.photosHint")}</Text>
              </View>
            ) : null}
          </>
        )
      ) : !summary ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <>
          <Card style={styles.list}>
            {summary.therapists.map((row, index) => (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                onPress={() => router.push(`/massage/team/${row.id}`)}
                style={[styles.row, index > 0 && styles.divider]}
              >
                <Avatar name={row.name} index={index} />
                <View style={styles.rowText}>
                  <Text style={type.bodyMedium}>{row.name}</Text>
                  <Text style={type.caption}>
                    {[
                      t("attendance.worked", { worked: formatWorked(row.workedMinutes) }),
                      t("attendance.ofPlanned", { planned: formatWorked(row.plannedMinutes) }),
                      row.lateCount ? plural("attendance.lateTimes", row.lateCount) : null,
                      row.openEntries ? plural("attendance.open", row.openEntries) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.8} />
              </Pressable>
            ))}
          </Card>

          <Button
            label={t("attendance.export")}
            loading={exporting}
            icon={<Download size={18} color={colors.text} strokeWidth={1.8} />}
            onPress={exportCsv}
          />
        </>
      )}

      <Button
        label={t("attendance.useAsClock")}
        variant="primary"
        icon={<Lock size={18} color={colors.onPrimary} strokeWidth={1.8} />}
        onPress={() => router.push("/massage/clock")}
      />

      <EntrySheet
        visible={!!editing}
        date={today}
        row={editing}
        onClose={() => setEditingId(null)}
        onChanged={load}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },

  loading: {
    marginVertical: spacing.xxl,
  },

  error: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.danger,
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

  rowText: {
    flex: 1,
    gap: 2,
  },

  status: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 150,
  },

  statusText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },

  section: {
    gap: spacing.sm,
  },

  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
  },

  photos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  photo: {
    width: 104,
    gap: 4,
  },

  photoImage: {
    width: 104,
    height: 130,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },

  photoCaption: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
});
