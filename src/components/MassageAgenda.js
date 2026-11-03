import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Badge } from "./ui";
import { isInProgress } from "../hooks/useDayAppointments";
import {
  colors,
  fonts,
  radius,
  spacing,
} from "../theme";
import { formatTime } from "../utils/date";
import { formatDuration, formatPrice } from "../utils/price";

// ======================================================
// MassageAgenda
// ======================================================
//
// The appointments of one day as a list of rows. The
// screen loads them (useDayAppointments) and passes them
// in. A confirmed appointment can be marked as completed,
// no-show or cancelled through onChangeStatus.
// ======================================================

const STATUS_LABELS = {
  CONFIRMED: "Bevestigd",
  IN_PROGRESS: "Bezig",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
  NO_SHOW: "Niet verschenen",
};

export default function MassageAgenda({
  appointments,
  isLoading,
  error,
  onChangeStatus,
  emptyText = "Geen afspraken op deze dag.",
}) {
  if (isLoading) {
    return <ActivityIndicator style={styles.loading} />;
  }

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  if (appointments.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.empty}>{emptyText}</Text>
      </View>
    );
  }

  const now = new Date();

  return (
    <View style={styles.list}>
      {appointments.map((appointment, index) => {
        const status = isInProgress(appointment, now)
          ? "IN_PROGRESS"
          : appointment.status;

        const inactive =
          appointment.status === "CANCELLED" ||
          appointment.status === "NO_SHOW";

        return (
          <View
            key={appointment.id}
            style={[
              styles.row,
              index > 0 && styles.rowDivider,
            ]}
          >
            <View style={styles.timeColumn}>
              <Text
                style={[
                  styles.time,
                  inactive && styles.inactiveText,
                ]}
              >
                {formatTime(appointment.startTime)}
              </Text>
              <Text style={styles.endTime}>
                {formatTime(appointment.endTime)}
              </Text>
            </View>

            <View style={styles.details}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.customer,
                    inactive && styles.inactiveText,
                  ]}
                  numberOfLines={1}
                >
                  {appointment.firstName}{" "}
                  {appointment.lastName}
                </Text>
                <Badge
                  label={STATUS_LABELS[status]}
                  status={status}
                />
              </View>

              <Text style={styles.meta}>
                {appointment.serviceName} ·{" "}
                {formatDuration(
                  appointment.durationMinutes
                )}{" "}
                · {formatPrice(appointment.priceCents)}
              </Text>

              <Text style={styles.meta}>
                {appointment.therapistName} ·{" "}
                {appointment.roomName} ·{" "}
                {appointment.phoneNumber}
              </Text>

              {!!appointment.notes && (
                <Text style={styles.notes}>
                  {appointment.notes}
                </Text>
              )}

              {appointment.status === "CONFIRMED" && (
                <View style={styles.actions}>
                  <ActionButton
                    label="Afgerond"
                    onPress={() =>
                      onChangeStatus(
                        appointment,
                        "COMPLETED"
                      )
                    }
                  />
                  <ActionButton
                    label="Niet verschenen"
                    onPress={() =>
                      onChangeStatus(
                        appointment,
                        "NO_SHOW"
                      )
                    }
                  />
                  <ActionButton
                    label="Annuleren"
                    danger
                    onPress={() =>
                      onChangeStatus(
                        appointment,
                        "CANCELLED"
                      )
                    }
                  />
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ActionButton({ label, onPress, danger = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.action,
        pressed && styles.actionPressed,
      ]}
    >
      <Text
        style={[
          styles.actionLabel,
          danger && styles.actionDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginVertical: spacing.xxl,
  },

  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
    marginVertical: spacing.lg,
  },

  emptyBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },

  empty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },

  list: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md + 2,
  },

  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  timeColumn: {
    width: 46,
  },

  time: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },

  endTime: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  details: {
    flex: 1,
    gap: 3,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },

  customer: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },

  inactiveText: {
    color: colors.textDisabled,
    textDecorationLine: "line-through",
  },

  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },

  notes: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.text,
    backgroundColor: colors.sandSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: 2,
    overflow: "hidden",
  },

  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  action: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },

  actionPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  actionLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.text,
  },

  actionDanger: {
    color: colors.danger,
  },
});
