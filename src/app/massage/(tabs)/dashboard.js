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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react-native";

import { useAuth } from "../../../context/auth-context";
import { api } from "../../../services/api";
import MassageAgenda from "../../../components/MassageAgenda";
import { Card, StatTile } from "../../../components/ui";
import useDayAppointments, {
  isActiveAppointment,
  isInProgress,
} from "../../../hooks/useDayAppointments";
import {
  colors,
  fonts,
  radius,
  spacing,
  touchTarget,
  type,
} from "../../../theme";
import {
  addDays,
  formatLongDate,
  formatTime,
  todayString,
} from "../../../utils/date";
import { formatPrice } from "../../../utils/price";
import { RefreshControl } from "react-native";

// ======================================================
// Vandaag (massage home)
// ======================================================
//
// The first tab of a massage business: a greeting, the
// day navigation, four numbers for the day, who is being
// treated right now and the agenda of the day.
//
// The calendar opens this screen with a ?date=YYYY-MM-DD
// parameter to show another day.
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

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => {
              setIsRefreshing(true);
              await reload();
              setIsRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
      >
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

        {/* Day navigation */}

        <View style={styles.dayNavigation}>
          <IconButton
            label="Vorige dag"
            onPress={() =>
              setDate((current) => addDays(current, -1))
            }
          >
            <ChevronLeft
              size={20}
              color={colors.text}
              strokeWidth={1.8}
            />
          </IconButton>

          <Pressable
            accessibilityRole="button"
            disabled={isToday}
            onPress={() => setDate(todayString())}
            style={styles.dayLabel}
          >
            <Text style={styles.dayTitle}>
              {isToday
                ? "Vandaag"
                : capitalize(formatLongDate(date))}
            </Text>
            {!isToday && (
              <Text style={styles.dayHint}>
                Tik voor vandaag
              </Text>
            )}
          </Pressable>

          <IconButton
            label="Volgende dag"
            onPress={() =>
              setDate((current) => addDays(current, 1))
            }
          >
            <ChevronRight
              size={20}
              color={colors.text}
              strokeWidth={1.8}
            />
          </IconButton>
        </View>

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

        {/* Agenda of the day */}

        <View style={styles.section}>
          <Text style={type.heading}>Afspraken</Text>

          <MassageAgenda
            appointments={appointments}
            isLoading={isLoading}
            error={error}
            onChangeStatus={confirmStatus}
          />
        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
}

function IconButton({ label, onPress, children }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && styles.iconButtonPressed,
      ]}
    >
      {children}
    </Pressable>
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

  // Day navigation

  dayNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  iconButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  iconButtonPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  dayLabel: {
    flex: 1,
    minHeight: touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },

  dayTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  dayHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
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
