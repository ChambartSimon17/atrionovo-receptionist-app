import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../../../context/auth-context";
import { api } from "../../../../services/api";
import { Button, Card } from "../../../../components/ui";
import { locale, plural, t } from "../../../../i18n";
import { colors, fonts, radius, spacing, type } from "../../../../theme";
import {
  dayColors,
  dayCount,
  formatClock,
  formatDateRange,
  formatMinutes,
  reasonLabel,
} from "../../../../components/team/team-format";

// ======================================================
// Absence (Team → an absence)
// ======================================================
//
// The appointments that fall in an absence, each with
// the colleagues who are free then: give it to one of
// them, call the customer, or cancel it. The absence can
// also be removed here.
// ======================================================

export default function AbsenceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { business, accessToken } = useAuth();

  const [absence, setAbsence] = useState(null);
  const [conflicts, setConflicts] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.getAbsence(business.id, id, accessToken);

      setAbsence(response.data.absence);
      setConflicts(response.data.conflicts);
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

  async function giveTo(appointment, colleague) {
    setBusyId(appointment.id);

    try {
      await api.reassignAppointment(business.id, appointment.id, colleague.id, accessToken);
      await load();
    } catch (reassignError) {
      Alert.alert(t("common.error"), reassignError.message);
    } finally {
      setBusyId(null);
    }
  }

  function cancel(appointment) {
    Alert.alert(t("team.cancelConfirm", { name: `${appointment.firstName} ${appointment.lastName}` }), undefined, [
      { text: t("common.back"), style: "cancel" },
      {
        text: t("team.cancelAppointment"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.updateMassageAppointment(
              business.id,
              appointment.id,
              { status: "CANCELLED" },
              accessToken
            );
            await load();
          } catch (cancelError) {
            Alert.alert(t("common.error"), cancelError.message);
          }
        },
      },
    ]);
  }

  function removeAbsence() {
    Alert.alert(t("team.deleteAbsence"), t("team.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteAbsence(business.id, id, accessToken);
            router.back();
          } catch (deleteError) {
            Alert.alert(t("common.error"), deleteError.message);
          }
        },
      },
    ]);
  }

  if (!conflicts) {
    return (
      <SafeAreaView style={styles.screen} edges={[]}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator style={styles.loading} />}
      </SafeAreaView>
    );
  }

  const palette = absence ? dayColors[absence.reason] : dayColors.SICK;

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {absence ? (
          <View style={styles.header}>
            <View style={[styles.reason, { backgroundColor: palette.background }]}>
              <Text style={[styles.reasonText, { color: palette.text }]}>{reasonLabel(absence.reason)}</Text>
            </View>
            <Text style={type.title}>{absence.therapistName}</Text>
            <Text style={type.caption}>
              {[
                formatDateRange(absence.startDate, absence.endDate),
                plural("team.dayCount", dayCount(absence.startDate, absence.endDate)),
                absence.startMinutes !== null && absence.startMinutes !== undefined
                  ? `${formatMinutes(absence.startMinutes)} – ${formatMinutes(absence.endMinutes)}`
                  : null,
                absence.note,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        ) : null}

        <Text style={styles.label}>{t("team.affected")}</Text>

        {conflicts.length === 0 ? (
          <Text style={type.caption}>{t("team.noAffected")}</Text>
        ) : (
          conflicts.map((appointment) => (
            <Card key={appointment.id} style={styles.card}>
              <Text style={type.bodyMedium}>
                {new Date(appointment.startTime).toLocaleDateString(locale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {formatClock(appointment.startTime)} – {formatClock(appointment.endTime)}
              </Text>
              <Text style={type.body}>
                {appointment.firstName} {appointment.lastName} · {appointment.serviceName}
              </Text>
              <Text style={type.caption}>
                {appointment.roomName} · {appointment.phoneNumber}
              </Text>

              <View style={styles.actions}>
                {appointment.alternatives.length === 0 ? (
                  <Text style={styles.none}>{t("team.noColleague")}</Text>
                ) : (
                  appointment.alternatives.map((colleague) => (
                    <Button
                      key={colleague.id}
                      variant="primary"
                      label={t("team.giveTo", { name: colleague.name })}
                      loading={busyId === appointment.id}
                      onPress={() => giveTo(appointment, colleague)}
                    />
                  ))
                )}
                <View style={styles.secondary}>
                  <Button
                    style={styles.half}
                    label={t("team.callCustomer")}
                    onPress={() => Linking.openURL(`tel:${appointment.phoneNumber}`)}
                  />
                  <Button
                    style={styles.half}
                    variant="danger"
                    label={t("team.cancelAppointment")}
                    onPress={() => cancel(appointment)}
                  />
                </View>
              </View>
            </Card>
          ))
        )}

        <Button label={t("team.deleteAbsence")} variant="danger" onPress={removeAbsence} style={styles.delete} />
      </ScrollView>
    </SafeAreaView>
  );
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
    gap: spacing.md,
  },

  header: {
    gap: spacing.xs,
    alignItems: "flex-start",
  },

  reason: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  reasonText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },

  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: spacing.md,
  },

  card: {
    gap: 4,
  },

  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  none: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.warning,
  },

  secondary: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  half: {
    flex: 1,
  },

  delete: {
    marginTop: spacing.lg,
  },
});
