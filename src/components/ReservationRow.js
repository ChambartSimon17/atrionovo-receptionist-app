import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Armchair,
  DoorOpen,
  StickyNote,
  Users,
} from "lucide-react-native";

import { tableNames } from "../hooks/useRestaurantDay";
import { Badge, Button } from "./ui";
import {
  colors,
  fonts,
  spacing,
  type,
} from "../theme";
import { formatTime } from "../utils/date";

// ======================================================
// Reservation row
// ======================================================
//
// One reservation in a list: time, name, party size,
// tables, the note and a status badge. With showActions
// (today) an open reservation gets a small button for its
// next step: "Aan tafel" when the guests arrive (filled
// once they are expected), "Vertrokken" when they leave.
// ======================================================

// Guests count as late this many minutes after the start.
const LATE_AFTER_MINUTES = 15;

// Guests are expected from this many minutes before the
// start; from then on seating them is the next step.
const DUE_BEFORE_MINUTES = 30;

export function reservationState(reservation, now = new Date()) {
  if (reservation.status === "SEATED") {
    return "SEATED";
  }

  if (reservation.status !== "CONFIRMED") {
    return reservation.status;
  }

  const minutesPast =
    (now.getTime() -
      new Date(reservation.startTime).getTime()) /
    60000;

  return minutesPast >= LATE_AFTER_MINUTES
    ? "LATE"
    : "CONFIRMED";
}

const STATE_BADGES = {
  CONFIRMED: { label: "Bevestigd", status: "CONFIRMED" },
  LATE: { label: "Te laat", status: "ARRIVING" },
  SEATED: { label: "Aan tafel", status: "SEATED" },
  COMPLETED: { label: "Afgerond", status: "COMPLETED" },
  CANCELLED: { label: "Geannuleerd", status: "CANCELLED" },
  NO_SHOW: { label: "Niet verschenen", status: "NO_SHOW" },
};

export function guestLabel(count) {
  return count === 1 ? "1 persoon" : `${count} personen`;
}

export default function ReservationRow({
  reservation,
  tables = [],
  onPress,
  onSeat,
  onComplete,
  busy = false,
  divider = false,
  showActions = true,
  now = new Date(),
}) {
  const state = reservationState(reservation, now);
  const isDue =
    state === "LATE" ||
    (state === "CONFIRMED" &&
      new Date(reservation.startTime).getTime() -
        now.getTime() <=
        DUE_BEFORE_MINUTES * 60000);
  const badge = STATE_BADGES[state];
  const tablesText = tableNames(reservation, tables);

  return (
    <View style={[styles.row, divider && styles.divider]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.main,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.time}>
          <Text style={styles.timeText}>
            {formatTime(reservation.startTime)}
          </Text>
          <View
            style={[
              styles.timeBar,
              state === "SEATED" && styles.timeBarSeated,
              state === "LATE" && styles.timeBarLate,
            ]}
          />
        </View>

        <View style={styles.details}>
          <View style={styles.titleRow}>
            <Text
              style={[type.bodyMedium, styles.name]}
              numberOfLines={1}
            >
              {reservation.firstName} {reservation.lastName}
            </Text>
            {!!badge && (
              <Badge label={badge.label} status={badge.status} />
            )}
          </View>

          <View style={styles.metaRow}>
            <Meta icon={Users}>
              {guestLabel(reservation.guestCount)}
            </Meta>
            {!!tablesText && (
              <Meta icon={Armchair}>{tablesText}</Meta>
            )}
          </View>

          {!!reservation.notes && (
            <View style={styles.note}>
              <StickyNote
                size={13}
                color="#8A5A14"
                strokeWidth={1.8}
              />
              <Text style={styles.noteText} numberOfLines={2}>
                {reservation.notes}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {showActions && state === "SEATED" && onComplete && (
        <Button
          label="Vertrokken"
          loading={busy}
          onPress={() => onComplete(reservation)}
          icon={
            <DoorOpen
              size={16}
              color={colors.text}
              strokeWidth={1.8}
            />
          }
          style={styles.action}
        />
      )}

      {showActions &&
        (state === "CONFIRMED" || state === "LATE") &&
        onSeat && (
          <Button
            label="Aan tafel"
            variant={isDue ? "primary" : "secondary"}
            loading={busy}
            onPress={() => onSeat(reservation)}
            icon={
              <Armchair
                size={16}
                color={isDue ? colors.onPrimary : colors.text}
                strokeWidth={1.8}
              />
            }
            style={styles.action}
          />
        )}
    </View>
  );
}

function Meta({ icon: Icon, children }) {
  return (
    <View style={styles.meta}>
      <Icon
        size={13}
        color={colors.textMuted}
        strokeWidth={1.8}
      />
      <Text style={type.caption}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    gap: spacing.sm + 2,
  },

  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  main: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: 8,
  },

  pressed: {
    opacity: 0.7,
  },

  time: {
    width: 46,
    alignItems: "flex-start",
    gap: 6,
  },

  timeText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },

  timeBar: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primaryBorder,
  },

  timeBarSeated: {
    backgroundColor: colors.primary,
  },

  timeBarLate: {
    backgroundColor: "#E2B970",
  },

  details: {
    flex: 1,
    gap: 5,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  name: {
    flex: 1,
    fontSize: 15,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.md,
    rowGap: 2,
  },

  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.sandSoft,
  },

  noteText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: "#6B5326",
  },

  action: {
    alignSelf: "flex-start",
    marginLeft: 46 + spacing.md,
    paddingHorizontal: spacing.md,
  },
});
