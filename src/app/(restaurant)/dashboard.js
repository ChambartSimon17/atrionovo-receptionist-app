import {
  useEffect,
  useState,
} from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  Plus,
  Undo2,
} from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import DayNavigation from "../../components/DayNavigation";
import ReservationRow, {
  reservationState,
} from "../../components/ReservationRow";
import { Card, SkeletonList, StatTile } from "../../components/ui";
import { plural, t } from "../../i18n";
import useRestaurantDay, {
  isInsideService,
} from "../../hooks/useRestaurantDay";
import useWideLayout from "../../hooks/useWideLayout";
import {
  colors,
  fonts,
  radius,
  spacing,
  type,
} from "../../theme";
import {
  formatLongDate,
  formatTime,
  todayString,
} from "../../utils/date";

// ======================================================
// Vandaag (restaurant home)
// ======================================================
//
// The first tab of a restaurant: a greeting, the day
// navigation, four numbers for the day and the
// reservations per service (lunch and dinner), each with
// how full the service is. Below, the reservations that
// are done (left, not come, cancelled); a tap by mistake
// can be undone there. The AI receptionist switch lives
// in Restaurantgegevens.
//
// The calendar opens this screen with a ?date=YYYY-MM-DD
// parameter to show another day.
//
// On a tablet in landscape the day, its numbers and the
// finished reservations stay on the left and the services
// scroll on the right.
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

function sumGuests(reservations) {
  return reservations.reduce(
    (sum, reservation) => sum + reservation.guestCount,
    0
  );
}

export default function RestaurantTodayScreen() {
  const router = useRouter();
  const wide = useWideLayout();

  const { user, business } = useAuth();

  const { date: dateParam } = useLocalSearchParams();

  const [date, setDate] = useState(() =>
    isValidDateParam(dateParam) ? dateParam : todayString()
  );

  // Follow the day chosen in the calendar.
  useEffect(() => {
    if (isValidDateParam(dateParam)) {
      setDate(dateParam);
    }
  }, [dateParam]);

  const {
    reservations,
    allReservations,
    services,
    tables,
    isLoading,
    isRefreshing,
    error,
    reload,
    seat,
    complete,
    undo,
    actionId,
  } = useRestaurantDay(date);

  const finished = allReservations
    .filter((reservation) =>
      ["COMPLETED", "NO_SHOW", "CANCELLED"].includes(reservation.status)
    )
    .sort((a, b) => new Date(b.updatedAt ?? b.startTime) - new Date(a.updatedAt ?? a.startTime));

  const now = new Date();
  const isToday = date === todayString();

  const seated = reservations.filter(
    (reservation) => reservation.status === "SEATED"
  );
  const waiting = reservations.filter(
    (reservation) => reservation.status === "CONFIRMED"
  );
  const late = isToday
    ? waiting.filter(
        (reservation) =>
          reservationState(reservation, now) === "LATE"
      )
    : [];
  const seats = tables.reduce(
    (sum, table) => sum + (table.capacity ?? 0),
    0
  );

  // Reservations outside every service still show up,
  // in their own group at the end.
  const groups = services.map((service) => ({
    ...service,
    reservations: reservations.filter((reservation) =>
      isInsideService(reservation, service)
    ),
  }));

  const outside = reservations.filter(
    (reservation) =>
      !services.some((service) =>
        isInsideService(reservation, service)
      )
  );

  if (outside.length > 0) {
    groups.push({
      key: "outside",
      title: "Buiten de openingsuren",
      subtitle: null,
      reservations: outside,
    });
  }

  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={() => reload({ refresh: true })}
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

      <DayNavigation date={date} onChange={setDate} />

      {/* Numbers of the day */}

      <View style={styles.tiles}>
        <StatTile
          tone="primary"
          style={styles.tile}
          label="Reservaties"
          value={String(reservations.length)}
          note={`${sumGuests(reservations)} couverts`}
        />
        <StatTile
          style={styles.tile}
          label="Nog te komen"
          value={String(waiting.length)}
          note={
            late.length > 0
              ? `${late.length} te laat`
              : `${sumGuests(waiting)} personen`
          }
        />
        <StatTile
          style={styles.tile}
          label="Aan tafel"
          value={String(seated.length)}
          note={`${sumGuests(seated)} personen`}
        />
        <StatTile
          style={styles.tile}
          label="Tafels"
          value={String(tables.length)}
          note={`${seats} plaatsen`}
        />
      </View>
    </>
  );

  const servicesList = (
    <>
      {/* Reservations per service */}

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : services.length === 0 && outside.length === 0 ? (
        <Card style={styles.closed}>
          <Text style={type.heading}>Gesloten</Text>
          <Text style={type.caption}>
            Er zijn voor deze dag geen openingsuren
            ingesteld.
          </Text>
        </Card>
      ) : (
        groups.map((group) => {
          const covers = sumGuests(group.reservations);
          const fill =
            seats > 0 ? Math.min(1, covers / seats) : 0;

          return (
            <View key={group.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={type.heading}>
                    {group.title}
                  </Text>
                  {!!group.subtitle && (
                    <Text style={type.caption}>
                      {group.subtitle}
                    </Text>
                  )}
                </View>
                <View style={styles.sectionNumbers}>
                  <Text style={styles.covers}>
                    {covers}
                    {seats > 0 ? ` / ${seats}` : ""}
                  </Text>
                  <Text style={type.caption}>couverts</Text>
                </View>
              </View>

              {seats > 0 && (
                <View style={styles.fillTrack}>
                  <View
                    style={[
                      styles.fillBar,
                      { width: `${Math.round(fill * 100)}%` },
                      fill >= 0.9 && styles.fillBarFull,
                    ]}
                  />
                </View>
              )}

              <Card style={styles.list}>
                {group.reservations.length === 0 ? (
                  <Text style={styles.empty}>
                    Nog geen reservaties.
                  </Text>
                ) : (
                  group.reservations.map(
                    (reservation, index) => (
                      <ReservationRow
                        key={reservation.id}
                        reservation={reservation}
                        tables={tables}
                        divider={index > 0}
                        showActions={isToday}
                        now={now}
                        busy={actionId === reservation.id}
                        onPress={() =>
                          router.push(
                            `/reservation/${reservation.id}`
                          )
                        }
                        onSeat={seat}
                        onComplete={complete}
                      />
                    )
                  )
                )}
              </Card>
            </View>
          );
        })
      )}
    </>
  );

  const finishedList = (
    <>
      {/* Done for today, with undo */}

      {!isLoading && finished.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={type.heading}>{t("dashboard.finished")}</Text>
            <Text style={type.caption}>{finished.length}</Text>
          </View>
          <Card style={styles.list}>
            {finished.map((reservation, index) => (
              <View
                key={reservation.id}
                style={[styles.finishedRow, index > 0 && styles.finishedDivider]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/reservation/${reservation.id}`)}
                  style={styles.finishedText}
                >
                  <Text style={styles.finishedName} numberOfLines={1}>
                    {formatTime(reservation.startTime)} ·{" "}
                    {`${reservation.firstName} ${reservation.lastName}`.trim()}
                  </Text>
                  <Text style={type.caption}>
                    {t(`dashboard.status.${reservation.status}`)} ·{" "}
                    {plural("dashboard.people", reservation.guestCount)}
                  </Text>
                </Pressable>
                {reservation.status !== "CANCELLED" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("dashboard.undo")}
                    disabled={actionId === reservation.id}
                    onPress={() => undo(reservation)}
                    style={({ pressed }) => [styles.undo, pressed && styles.fabPressed]}
                  >
                    <Undo2 size={14} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.undoText}>{t("dashboard.undo")}</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </>
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
            {finishedList}
          </ScrollView>
          <ScrollView
            style={styles.servicesPane}
            contentContainerStyle={styles.paneContent}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {servicesList}
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {day}
          {servicesList}
          {finishedList}
        </ScrollView>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nieuwe reservatie"
        onPress={() => router.push("/reservation/new")}
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
        <Text style={styles.fabLabel}>Reservatie</Text>
      </Pressable>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  finishedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  finishedDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  finishedText: {
    flex: 1,
    gap: 2,
  },

  finishedName: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },

  undo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },

  undoText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.primary,
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
    paddingBottom: 96,
    gap: spacing.xl,
  },

  // Tablet in landscape: the day left, the services right

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

  servicesPane: {
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

  // AI receptionist


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

  // Services

  loading: {
    marginTop: spacing.xl,
  },

  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
  },

  closed: {
    gap: spacing.xs,
  },

  section: {
    gap: 10,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  sectionNumbers: {
    alignItems: "flex-end",
  },

  covers: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  fillTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.segmentTrack,
    overflow: "hidden",
  },

  fillBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sage,
  },

  fillBarFull: {
    backgroundColor: colors.primary,
  },

  list: {
    paddingVertical: spacing.xs,
  },

  empty: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },

  // New reservation button

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
