import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import { useAuth } from "../../../context/auth-context";
import { api } from "../../../services/api";
import {
  Badge,
  Button,
  Card,
  Chip,
} from "../../../components/ui";
import MassageFloorView from "../../../components/floor/MassageFloorView";
import { SegmentedControl, SkeletonList } from "../../../components/ui";
import useFloorPlan from "../../../hooks/useFloorPlan";
import { t } from "../../../i18n";
import useDayAppointments, {
  isActiveAppointment,
} from "../../../hooks/useDayAppointments";
import {
  colors,
  fonts,
  radius,
  spacing,
  type,
} from "../../../theme";
import {
  formatTime,
  todayString,
} from "../../../utils/date";

// ======================================================
// Kamers (live)
// ======================================================
//
// What every treatment room is doing right now: busy
// (with who and how long), being cleaned (the buffer
// after an appointment) or free, plus the next booking.
// Below, a timeline of each room's day with how full it
// is. The screen refreshes every minute.
// ======================================================

const DAY_START = 9 * 60;
const DAY_END = 18 * 60;

const FILTERS = [
  { value: "ALL", label: "Alle" },
  { value: "FREE", label: "Vrij" },
  { value: "BUSY", label: "Bezet" },
  { value: "CLEANING", label: "Schoonmaak" },
];

function minutesOfDay(isoString) {
  const date = new Date(isoString);

  return date.getHours() * 60 + date.getMinutes();
}

function roomState(room, appointments, now, bufferMinutes) {
  const own = appointments
    .filter(
      (appointment) =>
        isActiveAppointment(appointment) &&
        (appointment.roomId
          ? appointment.roomId === room.id
          : appointment.roomName === room.name)
    )
    .sort(
      (a, b) =>
        new Date(a.startTime) - new Date(b.startTime)
    );

  const current = own.find(
    (appointment) =>
      appointment.status === "CONFIRMED" &&
      new Date(appointment.startTime) <= now &&
      now < new Date(appointment.endTime)
  );

  const cleaning =
    !current &&
    bufferMinutes > 0 &&
    own.find((appointment) => {
      const end = new Date(appointment.endTime);

      return (
        end <= now &&
        now < new Date(end.getTime() + bufferMinutes * 60000)
      );
    });

  const next = own.find(
    (appointment) => new Date(appointment.startTime) > now
  );

  const bookedMinutes = own.reduce(
    (sum, appointment) =>
      sum + (appointment.durationMinutes ?? 0),
    0
  );

  return {
    state: current ? "BUSY" : cleaning ? "CLEANING" : "FREE",
    current,
    cleaning,
    next,
    own,
    occupancy: Math.min(
      100,
      Math.round(
        (bookedMinutes / (DAY_END - DAY_START)) * 100
      )
    ),
  };
}

export default function LiveRoomsScreen() {
  const router = useRouter();

  const { business, accessToken } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [now, setNow] = useState(() => new Date());

  const { appointments, isLoading, error } =
    useDayAppointments(todayString());

  // The plan view when rooms are drawn on the floor plan.
  const { plan } = useFloorPlan();
  const hasPlan = Boolean(
    plan?.elements.some((element) => element.type === "ROOM" && element.treatmentRoomId)
  );
  const [view, setView] = useState("plan");

  useFocusEffect(
    useCallback(() => {
      if (!business?.id) {
        return;
      }

      api
        .getTreatmentRooms(business.id, accessToken)
        .then((response) => setRooms(response.data))
        .catch(() => setRooms([]))
        .finally(() => setRoomsLoading(false));
    }, [business?.id, accessToken])
  );

  // Keep the minutes left and the states current.
  useEffect(() => {
    const timer = setInterval(
      () => setNow(new Date()),
      60000
    );

    return () => clearInterval(timer);
  }, []);

  // The break between appointments (cleaning) is not in
  // the login answer, so it comes from the business.
  const [bufferMinutes, setBufferMinutes] = useState(
    business?.appointmentBufferMinutes ?? 0
  );

  useFocusEffect(
    useCallback(() => {
      api
        .getMyBusiness(accessToken)
        .then((response) =>
          setBufferMinutes(
            (response?.data ?? response)?.appointmentBufferMinutes ?? 0
          )
        )
        .catch(() => {});
    }, [accessToken])
  );

  const states = rooms.map((room) => ({
    room,
    ...roomState(room, appointments, now, bufferMinutes),
  }));

  const counts = states.reduce(
    (result, item) => {
      result[item.state] += 1;
      return result;
    },
    { FREE: 0, BUSY: 0, CLEANING: 0 }
  );

  const visible = states.filter(
    (item) => filter === "ALL" || item.state === filter
  );

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const viewToggle = hasPlan ? (
    <View style={styles.viewToggle}>
      <SegmentedControl
        options={[
          { value: "plan", label: t("floor.room.planView") },
          { value: "list", label: t("floor.room.listView") },
        ]}
        value={view}
        onChange={setView}
      />
    </View>
  ) : null;

  if (hasPlan && view === "plan") {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={[styles.titleRow, styles.planHeader]}>
          <View style={styles.titleText}>
            <Text style={type.title}>{t("floor.room.title")}</Text>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={type.caption}>
                {t("floor.live", { time: formatTime(now.toISOString()) })}
              </Text>
            </View>
          </View>
          <Button
            label={t("floor.edit")}
            onPress={() => router.push("/floor-plan/edit")}
          />
        </View>
        <View style={styles.planToggle}>{viewToggle}</View>
        {isLoading ? (
          <SkeletonList rows={3} style={styles.planHeader} />
        ) : (
          <MassageFloorView
            plan={plan}
            appointments={appointments}
            now={now}
            bufferMinutes={bufferMinutes}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={type.title}>Kamers</Text>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={type.caption}>
                Live · {formatTime(now.toISOString())}
              </Text>
            </View>
          </View>
          <Button
            label="Beheer"
            onPress={() => router.push("/massage/rooms")}
          />
        </View>

        {viewToggle}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((option) => (
            <Chip
              key={option.value}
              label={
                option.value === "ALL"
                  ? `${option.label} (${rooms.length})`
                  : `${option.label} (${counts[option.value]})`
              }
              selected={filter === option.value}
              onPress={() => setFilter(option.value)}
            />
          ))}
        </ScrollView>

        {isLoading || roomsLoading ? (
          <SkeletonList rows={4} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : rooms.length === 0 ? (
          <Card>
            <Text style={type.body}>
              Nog geen behandelkamers. Voeg ze toe via
              Beheer.
            </Text>
          </Card>
        ) : (
          <>
            <View style={styles.grid}>
              {visible.map((item) => (
                <RoomCard
                  key={item.room.id}
                  item={item}
                  now={now}
                  onBook={() =>
                    router.push("/massage/new-appointment")
                  }
                />
              ))}
            </View>

            <Card style={styles.timeline}>
              <View style={styles.timelineHeader}>
                <Text style={type.heading}>
                  Tijdlijn vandaag
                </Text>
                <Text style={type.caption}>09–18 u</Text>
              </View>

              {states.map((item) => (
                <View
                  key={item.room.id}
                  style={styles.timelineRow}
                >
                  <Text
                    style={styles.timelineName}
                    numberOfLines={1}
                  >
                    {item.room.name}
                  </Text>
                  <View style={styles.track}>
                    {item.own.map((appointment) => {
                      const start = Math.max(
                        DAY_START,
                        minutesOfDay(appointment.startTime)
                      );
                      const end = Math.min(
                        DAY_END,
                        minutesOfDay(appointment.endTime)
                      );

                      if (end <= start) {
                        return null;
                      }

                      const past =
                        minutesOfDay(appointment.endTime) <=
                        nowMinutes;
                      const live =
                        item.current?.id === appointment.id;

                      return (
                        <View
                          key={appointment.id}
                          style={[
                            styles.segment,
                            {
                              left: `${
                                ((start - DAY_START) /
                                  (DAY_END - DAY_START)) *
                                100
                              }%`,
                              width: `${
                                ((end - start) /
                                  (DAY_END - DAY_START)) *
                                100
                              }%`,
                              backgroundColor: live
                                ? colors.primary
                                : past
                                  ? colors.textDisabled
                                  : colors.sage,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <Text style={styles.timelinePercent}>
                    {item.occupancy}%
                  </Text>
                </View>
              ))}

              <View style={styles.legend}>
                <LegendItem
                  color={colors.primary}
                  label="Nu"
                />
                <LegendItem
                  color={colors.sage}
                  label="Gepland"
                />
                <LegendItem
                  color={colors.textDisabled}
                  label="Voorbij"
                />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RoomCard({ item, now, onBook }) {
  const { room, state, current, cleaning, next } = item;

  if (state === "BUSY") {
    const start = new Date(current.startTime).getTime();
    const end = new Date(current.endTime).getTime();
    const progress = Math.min(
      1,
      (now.getTime() - start) / (end - start)
    );
    const left = Math.max(
      0,
      Math.round((end - now.getTime()) / 60000)
    );

    return (
      <Card style={styles.roomCard}>
        <RoomHeader
          name={room.name}
          label="Bezet"
          background={colors.primary}
          color={colors.onPrimary}
        />
        <View style={styles.roomBody}>
          <Text style={type.bodyMedium} numberOfLines={1}>
            {current.firstName} {current.lastName}
          </Text>
          <Text style={type.caption} numberOfLines={1}>
            {current.serviceName} · {current.therapistName}
          </Text>
        </View>
        <View style={styles.roomFooter}>
          <View style={styles.roomTimes}>
            <Text style={type.caption}>
              {formatTime(current.startTime)}–
              {formatTime(current.endTime)}
            </Text>
            <Text style={styles.minutesLeft}>
              {left} min
            </Text>
          </View>
          <ProgressBar value={progress} />
          <NextLine next={next} />
        </View>
      </Card>
    );
  }

  if (state === "CLEANING") {
    return (
      <Card style={[styles.roomCard, styles.cleaningCard]}>
        <RoomHeader
          name={room.name}
          label="Schoonmaak"
          background={colors.warningSoft}
          color={colors.warning}
        />
        <View style={styles.roomBody}>
          <Text style={type.bodyMedium}>
            Pauze na afspraak
          </Text>
          <Text style={type.caption}>
            Afgelopen om {formatTime(cleaning.endTime)}
          </Text>
        </View>
        <View style={styles.roomFooter}>
          <NextLine next={next} />
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.roomCard}>
      <RoomHeader
        name={room.name}
        label="Vrij"
        background={colors.primarySoft}
        color={colors.primary}
      />
      <View style={styles.roomBody}>
        <Text style={type.bodyMedium}>
          Klaar voor gebruik
        </Text>
        <Text style={type.caption}>
          {next
            ? `Vrij tot ${formatTime(next.startTime)}`
            : "Vrij voor de rest van de dag"}
        </Text>
      </View>
      <View style={styles.roomFooter}>
        <NextLine next={next} />
        <Pressable
          accessibilityRole="button"
          onPress={onBook}
          style={({ pressed }) => [
            styles.bookButton,
            pressed && styles.bookButtonPressed,
          ]}
        >
          <Text style={styles.bookLabel}>Boeken</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function RoomHeader({ name, label, background, color }) {
  return (
    <View style={styles.roomHeader}>
      <Text style={styles.roomName} numberOfLines={1}>
        {name}
      </Text>
      <Badge
        label={label}
        background={background}
        color={color}
      />
    </View>
  );
}

function NextLine({ next }) {
  if (!next) {
    return null;
  }

  return (
    <Text style={styles.nextLine} numberOfLines={1}>
      Hierna: {formatTime(next.startTime)}{" "}
      {next.firstName} {next.lastName?.[0]}.
    </Text>
  );
}

function ProgressBar({ value }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.round(value * 100)}%` },
        ]}
      />
    </View>
  );
}

function LegendItem({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[styles.legendSwatch, { backgroundColor: color }]}
      />
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  viewToggle: {
    marginTop: spacing.xs,
  },

  planHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },

  planToggle: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },

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
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  titleText: {
    gap: spacing.xs,
  },

  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2F8F5B",
  },

  filters: {
    gap: spacing.sm,
  },

  loading: {
    marginTop: spacing.xxl,
  },

  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  roomCard: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 178,
    gap: 10,
  },

  cleaningCard: {
    backgroundColor: colors.noteBackground,
    borderColor: colors.noteBorder,
  },

  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },

  roomName: {
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },

  roomBody: {
    gap: 2,
  },

  roomFooter: {
    marginTop: "auto",
    gap: 6,
  },

  roomTimes: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  minutesLeft: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.divider,
    overflow: "hidden",
  },

  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  nextLine: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },

  bookButton: {
    minHeight: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  bookButtonPressed: {
    backgroundColor: colors.primarySoft,
  },

  bookLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },

  timeline: {
    gap: spacing.md,
  },

  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  timelineName: {
    width: 70,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },

  track: {
    flex: 1,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },

  segment: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },

  timelinePercent: {
    width: 36,
    textAlign: "right",
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.text,
  },

  legend: {
    flexDirection: "row",
    gap: spacing.lg,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
});
