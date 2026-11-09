import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { Plus } from "lucide-react-native";

import { useAuth } from "../../../context/auth-context";
import { api } from "../../../services/api";
import MassageAgenda from "../../../components/MassageAgenda";
import WeekStrip from "../../../components/WeekStrip";
import CalendarSheet from "../../../components/CalendarSheet";
import { Card, StatTile } from "../../../components/ui";
import useDayAppointments, {
  isActiveAppointment,
  isInProgress,
} from "../../../hooks/useDayAppointments";
import {
  colors,
  fonts,
  spacing,
  type,
} from "../../../theme";
import {
  formatLongDate,
  formatTime,
  todayString,
} from "../../../utils/date";
import { formatPrice } from "../../../utils/price";
import useWideLayout from "../../../hooks/useWideLayout";
import { RefreshControl } from "react-native";

// ======================================================
// Vandaag (massage home)
// ======================================================
//
// The first tab of a massage business: a greeting, the
// day navigation, four numbers for the day, who is being
// treated right now and the agenda of the day.
//
// The week strip and its month calendar move to another
// day. The calendar opens this screen with a
// ?date=YYYY-MM-DD parameter to show another day.
//
// On a tablet in landscape the day and its numbers stay
// on the left and the agenda scrolls on the right.
// ======================================================

function isValidDateParam(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  );
}

function greeting(now) {
  const hour = now.getHours();

  if (hour < 12) {
    return "Goedemorgen";
  }

  return hour < 18 ? "Goedemiddag" : "Goedenavond";
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function initials(appointment) {
  return `${appointment.firstName?.[0] ?? ""}${
    appointment.lastName?.[0] ?? ""
  }`.toUpperCase();
}

export default function MassageTodayScreen() {
  const router = useRouter();
  const wide = useWideLayout();

  const { user, business, accessToken } = useAuth();

  const { date: dateParam } = useLocalSearchParams();

  const [date, setDate] = useState(() =>
    isValidDateParam(dateParam)
      ? dateParam
      : todayString()
  );

  const [roomCount, setRoomCount] = useState(null);

  // Follow the day chosen in the calendar.
  useEffect(() => {
    if (isValidDateParam(dateParam)) {
      setDate(dateParam);
    }
  }, [dateParam]);

  const {
    appointments,
    isLoading,
    error,
    confirmStatus,
    reload,
  } = useDayAppointments(date);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [monthCounts, setMonthCounts] = useState({});

  const loadCounts = useCallback(
    (year, month) =>
      api
        .getMassageAppointmentCountsForMonth(business.id, year, month, accessToken)
        .then((response) => response?.data ?? {}),
    [business?.id, accessToken]
  );

  // Dots under the days of the week strip.
  const monthKey = date.slice(0, 7);

  useEffect(() => {
    if (!business?.id) {
      return;
    }

    const [year, month] = monthKey.split("-").map(Number);

    loadCounts(year, month)
      .then(setMonthCounts)
      .catch(() => setMonthCounts({}));
  }, [business?.id, monthKey, loadCounts, appointments.length]);

  useFocusEffect(
    useCallback(() => {
      if (!business?.id) {
        return;
      }

      api
        .getTreatmentRooms(business.id, accessToken)
        .then((response) =>
          setRoomCount(response.data.length)
        )
        .catch(() => setRoomCount(null));
    }, [business?.id, accessToken])
  );

  const now = new Date();
  const isToday = date === todayString();

  const active = appointments.filter(isActiveAppointment);
  const completed = active.filter(
    (appointment) => appointment.status === "COMPLETED"
  );
  const inProgress = isToday
    ? active.filter((appointment) =>
        isInProgress(appointment, now)
      )
    : [];
  const missed = appointments.filter(
    (appointment) => appointment.status === "NO_SHOW"
  );
  const cancelled = appointments.filter(
    (appointment) => appointment.status === "CANCELLED"
  );
  const revenueCents = active.reduce(
    (sum, appointment) =>
      sum + (appointment.priceCents ?? 0),
    0
  );
  const busyRooms = new Set(
    inProgress.map((appointment) => appointment.roomName)
  ).size;

  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={async () => {
        setIsRefreshing(true);
        await reload();
        setIsRefreshing(false);
      }}
      tintColor={colors.primary}
    />
  );

  const day = (
    <>
      {/* Header */}

      <View style={styles.header}>
        <Text style={styles.headerDate}>
          {capitalize(formatLongDate(todayString()))}
        </Text>
        <Text style={type.title}>
          {greeting(now)}
          {user?.firstName ? `, ${user.firstName}` : ""}
        </Text>
        {!!business?.name && (
          <Text style={styles.businessName}>
            {business.name}
          </Text>
        )}
      </View>

      {/* Days: week strip, calendar */}

      <WeekStrip
        date={date}
        onChange={setDate}
        counts={monthCounts}
        onOpenCalendar={() => setCalendarOpen(true)}
      />

      {/* Numbers of the day */}

      <View style={styles.tiles}>
        <StatTile
          tone="primary"
          style={styles.tile}
          label="Afspraken"
          value={String(active.length)}
          note={`${completed.length} afgerond · ${
            active.length - completed.length
          } te gaan`}
        />
        <StatTile
          style={styles.tile}
          label="Omzet"
          value={formatPrice(revenueCents)}
          note={
            isToday
              ? `${formatPrice(
                  completed.reduce(
                    (sum, appointment) =>
                      sum + (appointment.priceCents ?? 0),
                    0
                  )
                )} al afgerond`
              : "verwacht"
          }
        />
        <StatTile
          style={styles.tile}
          label={isToday ? "Kamers bezet" : "Kamers"}
          value={
            roomCount === null
              ? "–"
              : isToday
                ? `${busyRooms} / ${roomCount}`
                : String(roomCount)
          }
          note={isToday ? "op dit moment" : "actief"}
        />
        <StatTile
          style={styles.tile}
          label="No-shows"
          value={String(missed.length)}
          note={`${cancelled.length} geannuleerd`}
        />
      </View>

      {/* Right now */}

      {inProgress.length > 0 && (
        <View style={styles.section}>
          <Text style={type.heading}>Nu bezig</Text>

          <Card style={styles.nowCard}>
            {inProgress.map((appointment, index) => {
              const start = new Date(
                appointment.startTime
              ).getTime();
              const end = new Date(
                appointment.endTime
              ).getTime();
              const progress = Math.min(
                1,
                Math.max(
                  0,
                  (now.getTime() - start) / (end - start)
                )
              );
              const minutesLeft = Math.max(
                0,
                Math.round(
                  (end - now.getTime()) / 60000
                )
              );

              return (
                <View
                  key={appointment.id}
                  style={[
                    styles.nowRow,
                    index > 0 && styles.nowDivider,
                  ]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {initials(appointment)}
                    </Text>
                  </View>
                  <View style={styles.nowDetails}>
                    <View style={styles.nowTitleRow}>
                      <Text style={type.bodyMedium}>
                        {appointment.firstName}{" "}
                        {appointment.lastName}
                      </Text>
                      <Text style={type.caption}>
                        nog {minutesLeft} min
                      </Text>
                    </View>
                    <Text style={type.caption}>
                      {appointment.serviceName} ·{" "}
                      {appointment.therapistName} ·{" "}
                      {appointment.roomName} · tot{" "}
                      {formatTime(appointment.endTime)}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.round(
                              progress * 100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      )}
    </>
  );

  const agenda = (
    <View style={styles.section}>
      <Text style={type.heading}>Afspraken</Text>

      <MassageAgenda
        appointments={appointments}
        isLoading={isLoading}
        error={error}
        onChangeStatus={confirmStatus}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {wide ? (
        <View style={styles.split}>
          <ScrollView
            style={styles.dayPane}
            contentContainerStyle={styles.paneContent}
            showsVerticalScrollIndicator={false}
          >
            {day}
          </ScrollView>
          <ScrollView
            style={styles.agendaPane}
            contentContainerStyle={styles.paneContent}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {agenda}
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {day}
          {agenda}
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
          size={20}
          color={colors.onPrimary}
          strokeWidth={2}
        />
        <Text style={styles.fabLabel}>Afspraak</Text>
      </Pressable>

      <CalendarSheet
        visible={calendarOpen}
        date={date}
        loadCounts={loadCounts}
        onClose={() => setCalendarOpen(false)}
        onSelect={(day) => {
          setCalendarOpen(false);
          setDate(day);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 96,
    gap: spacing.xl,
  },

  // Tablet in landscape: the day left, the agenda right

  split: {
    flex: 1,
    flexDirection: "row",
    width: "100%",
    maxWidth: 1240,
    alignSelf: "center",
  },

  dayPane: {
    width: 440,
    flexGrow: 0,
  },

  agendaPane: {
    flex: 1,
  },

  paneContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 96,
    gap: spacing.xl,
  },

  // Header

  header: {
    gap: spacing.xs,
  },

  headerDate: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },

  businessName: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },

  // Tiles

  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  tile: {
    flexBasis: "47%",
    flexGrow: 1,
  },

  // Sections

  section: {
    gap: 10,
  },

  nowCard: {
    paddingVertical: spacing.xs,
  },

  nowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  nowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },

  nowDetails: {
    flex: 1,
    gap: 6,
  },

  nowTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    overflow: "hidden",
  },

  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  // New appointment button

  fab: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.lg,
    height: 52,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xl,
    borderRadius: 26,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  fabPressed: {
    backgroundColor: colors.primaryPressed,
  },

  fabLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.onPrimary,
  },
});
