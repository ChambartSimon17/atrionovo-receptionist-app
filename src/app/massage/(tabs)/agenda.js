import {
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useRouter,
} from "expo-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react-native";

import { useAuth } from "../../../context/auth-context";
import { api } from "../../../services/api";
import { SegmentedControl } from "../../../components/ui";
import useDayAppointments, {
  isInProgress,
} from "../../../hooks/useDayAppointments";
import {
  colors,
  fonts,
  radius,
  spacing,
  statusColors,
  touchTarget,
  type,
} from "../../../theme";
import {
  addDays,
  formatTime,
  todayString,
} from "../../../utils/date";
import { formatPrice } from "../../../utils/price";

// ======================================================
// Agenda
// ======================================================
//
// One day as a time grid with a column per therapist (or
// per treatment room). The week strip picks the day, the
// red line marks the current time, and tapping an
// appointment offers the same status actions as the
// Today screen. "Maand" opens the month calendar.
// ======================================================

const HOUR_HEIGHT = 72;
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
const GUTTER_WIDTH = 48;
const MIN_COLUMN_WIDTH = 104;

const WEEKDAY_SHORT = ["zo", "ma", "di", "wo", "do", "vr", "za"];

const MONTHS = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
];

const VIEWS = [
  { value: "therapists", label: "Therapeuten" },
  { value: "rooms", label: "Kamers" },
];

function parseDay(dateString) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day, 12);
}

// Monday of the week the day falls in.
function startOfWeek(dateString) {
  const weekday = parseDay(dateString).getDay();

  return addDays(dateString, weekday === 0 ? -6 : 1 - weekday);
}

function minutesOfDay(isoString) {
  const date = new Date(isoString);

  return date.getHours() * 60 + date.getMinutes();
}

export default function MassageAgendaScreen() {
  const router = useRouter();

  const { width } = useWindowDimensions();

  const { business, accessToken } = useAuth();

  const [date, setDate] = useState(todayString);
  const [view, setView] = useState("therapists");
  const [therapists, setTherapists] = useState([]);
  const [rooms, setRooms] = useState([]);

  const {
    appointments,
    isLoading,
    error,
    confirmStatus,
  } = useDayAppointments(date);

  useFocusEffect(
    useCallback(() => {
      if (!business?.id) {
        return;
      }

      api
        .getTherapists(business.id, accessToken)
        .then((response) => setTherapists(response.data))
        .catch(() => setTherapists([]));

      api
        .getTreatmentRooms(business.id, accessToken)
        .then((response) => setRooms(response.data))
        .catch(() => setRooms([]));
    }, [business?.id, accessToken])
  );

  const today = todayString();
  const isToday = date === today;
  const weekStart = startOfWeek(date);
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index)
  );

  // Columns: the therapists or rooms, plus any that only
  // appear in an appointment (for example deactivated).
  const columnKey =
    view === "therapists" ? "therapistName" : "roomName";

  const columnNames = (
    view === "therapists" ? therapists : rooms
  ).map((item) => item.name);

  appointments.forEach((appointment) => {
    const name = appointment[columnKey];

    if (name && !columnNames.includes(name)) {
      columnNames.push(name);
    }
  });

  // Hours shown: at least 09:00–18:00, wider when an
  // appointment falls outside.
  let firstHour = 9;
  let lastHour = 18;

  appointments.forEach((appointment) => {
    firstHour = Math.min(
      firstHour,
      Math.floor(minutesOfDay(appointment.startTime) / 60)
    );
    lastHour = Math.max(
      lastHour,
      Math.ceil(minutesOfDay(appointment.endTime) / 60)
    );
  });

  const hours = Array.from(
    { length: lastHour - firstHour },
    (_, index) => firstHour + index
  );

  const gridWidth = width - spacing.xl * 2;
  const columnWidth = Math.max(
    MIN_COLUMN_WIDTH,
    columnNames.length > 0
      ? (gridWidth - GUTTER_WIDTH) / columnNames.length
      : gridWidth - GUTTER_WIDTH
  );

  const now = new Date();
  const nowOffset =
    (now.getHours() * 60 + now.getMinutes() - firstHour * 60) *
    MINUTE_HEIGHT;
  const showNowLine =
    isToday &&
    nowOffset >= 0 &&
    nowOffset <= hours.length * HOUR_HEIGHT;

  function openAppointment(appointment) {
    const summary = `${appointment.serviceName} · ${formatPrice(
      appointment.priceCents
    )}\n${appointment.therapistName} · ${
      appointment.roomName
    }\n${appointment.phoneNumber}${
      appointment.notes ? `\n\n${appointment.notes}` : ""
    }`;

    const title = `${formatTime(
      appointment.startTime
    )} ${appointment.firstName} ${appointment.lastName}`;

    if (appointment.status !== "CONFIRMED") {
      Alert.alert(title, summary);
      return;
    }

    Alert.alert(title, summary, [
      {
        text: "Afgerond",
        onPress: () => confirmStatus(appointment, "COMPLETED"),
      },
      {
        text: "Niet verschenen",
        onPress: () => confirmStatus(appointment, "NO_SHOW"),
      },
      {
        text: "Annuleren",
        style: "destructive",
        onPress: () => confirmStatus(appointment, "CANCELLED"),
      },
      { text: "Sluiten", style: "cancel" },
    ]);
  }

  const parsed = parseDay(date);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.top}>
        <View style={styles.titleRow}>
          <Text style={type.title}>
            {MONTHS[parsed.getMonth()]}
          </Text>
          <View style={styles.titleActions}>
            {!isToday && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setDate(today)}
                style={styles.pillButton}
              >
                <Text style={styles.pillButtonLabel}>
                  Vandaag
                </Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Maandoverzicht"
              onPress={() => router.push("/calendar")}
              style={styles.pillButton}
            >
              <CalendarDays
                size={16}
                color={colors.text}
                strokeWidth={1.8}
              />
              <Text style={styles.pillButtonLabel}>Maand</Text>
            </Pressable>
          </View>
        </View>

        <SegmentedControl
          options={VIEWS}
          value={view}
          onChange={setView}
        />

        <View style={styles.weekRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vorige week"
            onPress={() => setDate(addDays(date, -7))}
            style={styles.weekArrow}
          >
            <ChevronLeft
              size={18}
              color={colors.textMuted}
              strokeWidth={1.8}
            />
          </Pressable>

          {weekDays.map((day) => {
            const selected = day === date;
            const dayDate = parseDay(day);

            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setDate(day)}
                style={[
                  styles.day,
                  selected && styles.daySelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayName,
                    selected && styles.daySelectedText,
                  ]}
                >
                  {WEEKDAY_SHORT[dayDate.getDay()]}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    selected && styles.daySelectedText,
                    day === today &&
                      !selected &&
                      styles.dayToday,
                  ]}
                >
                  {dayDate.getDate()}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volgende week"
            onPress={() => setDate(addDays(date, 7))}
            style={styles.weekArrow}
          >
            <ChevronRight
              size={18}
              color={colors.textMuted}
              strokeWidth={1.8}
            />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : columnNames.length === 0 ? (
        <Text style={styles.empty}>
          {view === "therapists"
            ? "Voeg eerst een therapeut toe bij Meer."
            : "Voeg eerst een behandelkamer toe bij Meer."}
        </Text>
      ) : (
        <ScrollView
          horizontal
          contentContainerStyle={styles.horizontal}
          showsHorizontalScrollIndicator={false}
        >
          <View>
            {/* Column headers */}

            <View style={styles.headerRow}>
              <View style={{ width: GUTTER_WIDTH }} />
              {columnNames.map((name) => (
                <View
                  key={name}
                  style={[
                    styles.columnHeader,
                    { width: columnWidth },
                  ]}
                >
                  <View style={styles.columnAvatar}>
                    <Text style={styles.columnAvatarText}>
                      {name[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={styles.columnName}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                </View>
              ))}
            </View>

            {/* Time grid */}

            <ScrollView
              style={styles.vertical}
              contentContainerStyle={styles.verticalContent}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  height: hours.length * HOUR_HEIGHT,
                  flexDirection: "row",
                }}
              >
                <View style={{ width: GUTTER_WIDTH }}>
                  {hours.map((hour) => (
                    <Text
                      key={hour}
                      style={[
                        styles.hourLabel,
                        { height: HOUR_HEIGHT },
                      ]}
                    >
                      {String(hour).padStart(2, "0")}:00
                    </Text>
                  ))}
                </View>

                {columnNames.map((name) => (
                  <Pressable
                    key={name}
                    accessibilityLabel={`Nieuwe afspraak bij ${name}`}
                    onPress={() =>
                      router.push("/massage/new-appointment")
                    }
                    style={[
                      styles.column,
                      { width: columnWidth },
                    ]}
                  >
                    {hours.map((hour) => (
                      <View
                        key={hour}
                        style={[
                          styles.hourLine,
                          { height: HOUR_HEIGHT },
                        ]}
                      />
                    ))}

                    {appointments
                      .filter(
                        (appointment) =>
                          appointment[columnKey] === name
                      )
                      .map((appointment) => (
                        <AppointmentBlock
                          key={appointment.id}
                          appointment={appointment}
                          firstHour={firstHour}
                          view={view}
                          now={now}
                          onPress={() =>
                            openAppointment(appointment)
                          }
                        />
                      ))}
                  </Pressable>
                ))}

                {showNowLine && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.nowLine,
                      { top: nowOffset },
                    ]}
                  >
                    <View style={styles.nowDot} />
                    <View style={styles.nowBar} />
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nieuwe afspraak"
        onPress={() =>
          router.push("/massage/new-appointment")
        }
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
      >
        <Plus
          size={24}
          color={colors.onPrimary}
          strokeWidth={2}
        />
      </Pressable>
    </SafeAreaView>
  );
}

function AppointmentBlock({
  appointment,
  firstHour,
  view,
  now,
  onPress,
}) {
  const start = minutesOfDay(appointment.startTime);
  const end = minutesOfDay(appointment.endTime);

  const top = (start - firstHour * 60) * MINUTE_HEIGHT;
  const height = Math.max(28, (end - start) * MINUTE_HEIGHT - 2);

  const status = isInProgress(appointment, now)
    ? "IN_PROGRESS"
    : appointment.status;

  const palette = BLOCK_COLORS[status];
  const compact = height < 52;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.block,
        {
          top: top + 1,
          height,
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}
    >
      <Text
        style={[styles.blockTime, { color: palette.muted }]}
        numberOfLines={1}
      >
        {formatTime(appointment.startTime)}
        {compact
          ? ` ${appointment.firstName}`
          : ` · ${BLOCK_LABELS[status]}`}
      </Text>
      {!compact && (
        <>
          <Text
            style={[
              styles.blockName,
              { color: palette.text },
              (status === "CANCELLED" ||
                status === "NO_SHOW") &&
                styles.blockStruck,
            ]}
            numberOfLines={1}
          >
            {appointment.firstName} {appointment.lastName}
          </Text>
          <Text
            style={[
              styles.blockMeta,
              { color: palette.muted },
            ]}
            numberOfLines={1}
          >
            {appointment.serviceName} ·{" "}
            {view === "therapists"
              ? appointment.roomName
              : appointment.therapistName}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const BLOCK_LABELS = {
  CONFIRMED: "Bevestigd",
  IN_PROGRESS: "Bezig",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
  NO_SHOW: "No-show",
};

const BLOCK_COLORS = {
  CONFIRMED: {
    background: colors.primarySoft,
    border: colors.primaryBorder,
    text: colors.text,
    muted: "#3E5C55",
  },
  IN_PROGRESS: {
    background: colors.primary,
    border: colors.primary,
    text: colors.onPrimary,
    muted: colors.onPrimaryMuted,
  },
  COMPLETED: {
    background: statusColors.CANCELLED.background,
    border: colors.border,
    text: "#444441",
    muted: colors.textMuted,
  },
  CANCELLED: {
    background: colors.surface,
    border: colors.border,
    text: colors.textDisabled,
    muted: colors.textDisabled,
  },
  NO_SHOW: {
    background: statusColors.NO_SHOW.background,
    border: "#EBCB94",
    text: statusColors.NO_SHOW.text,
    muted: statusColors.NO_SHOW.text,
  },
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  top: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md + 2,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  titleActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  pillButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  pillButtonLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },

  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  weekArrow: {
    width: 28,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },

  day: {
    flex: 1,
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  daySelected: {
    backgroundColor: colors.primary,
  },

  dayName: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },

  dayNumber: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },

  dayToday: {
    color: colors.primary,
    fontFamily: fonts.semibold,
  },

  daySelectedText: {
    color: colors.onPrimary,
    fontFamily: fonts.semibold,
  },

  loading: {
    marginTop: spacing.xxl,
  },

  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
    paddingHorizontal: spacing.xl,
  },

  empty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },

  horizontal: {
    paddingHorizontal: spacing.xl,
  },

  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },

  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },

  columnAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  columnAvatarText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.primary,
  },

  columnName: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },

  vertical: {
    flex: 1,
  },

  verticalContent: {
    paddingTop: spacing.sm,
    paddingBottom: 96,
  },

  hourLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "right",
    paddingRight: spacing.sm,
    marginTop: -7,
  },

  column: {
    position: "relative",
    paddingHorizontal: 2,
  },

  hourLine: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  block: {
    position: "absolute",
    left: 2,
    right: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 5,
    gap: 1,
    overflow: "hidden",
  },

  blockTime: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },

  blockName: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },

  blockStruck: {
    textDecorationLine: "line-through",
  },

  blockMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },

  nowLine: {
    position: "absolute",
    left: GUTTER_WIDTH - 4,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    marginTop: -4,
  },

  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.live,
  },

  nowBar: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.live,
  },

  fab: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  fabPressed: {
    backgroundColor: colors.primaryPressed,
  },
});
