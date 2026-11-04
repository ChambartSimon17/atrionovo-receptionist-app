import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
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
  Phone,
  Plus,
} from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import DayNavigation from "../../components/DayNavigation";
import ReservationRow, {
  reservationState,
} from "../../components/ReservationRow";
import { Card, StatTile } from "../../components/ui";
import useRestaurantDay, {
  isInsideService,
} from "../../hooks/useRestaurantDay";
import {
  colors,
  fonts,
  radius,
  spacing,
  type,
} from "../../theme";
import { switchColors } from "../../theme/settingsStyles";
import {
  formatLongDate,
  todayString,
} from "../../utils/date";

// ======================================================
// Vandaag (restaurant home)
// ======================================================
//
// The first tab of a restaurant: a greeting, the AI phone
// receptionist switch, the day navigation, four numbers
// for the day and the reservations per service (lunch and
// dinner), each with how full the service is.
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

function sumGuests(reservations) {
  return reservations.reduce(
    (sum, reservation) => sum + reservation.guestCount,
    0
  );
}

export default function RestaurantTodayScreen() {
  const router = useRouter();

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
    services,
    tables,
    isLoading,
    isRefreshing,
    error,
    reload,
    seat,
    complete,
    actionId,
  } = useRestaurantDay(date);

  const voiceAgent = useVoiceAgent();

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

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => reload({ refresh: true })}
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

        {/* AI receptionist */}

        <Card style={styles.voiceCard}>
          <View
            style={[
              styles.voiceIcon,
              voiceAgent.enabled && styles.voiceIconOn,
            ]}
          >
            <Phone
              size={18}
              color={
                voiceAgent.enabled
                  ? colors.onPrimary
                  : colors.textMuted
              }
              strokeWidth={1.8}
            />
          </View>
          <View style={styles.voiceText}>
            <Text style={type.bodyMedium}>
              AI-receptionist
            </Text>
            <Text style={type.caption}>
              {voiceAgent.enabled
                ? "Actief · neemt onbeantwoorde oproepen op"
                : "Uit · de AI neemt niet op"}
            </Text>
          </View>
          <Switch
            value={voiceAgent.enabled}
            disabled={voiceAgent.isUpdating}
            onValueChange={voiceAgent.toggle}
            accessibilityLabel="AI-receptionist"
            {...switchColors}
          />
        </Card>

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

        {/* Reservations per service */}

        {isLoading ? (
          <ActivityIndicator
            color={colors.primary}
            style={styles.loading}
          />
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
      </ScrollView>

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

// The AI phone receptionist switch, saved right away and
// put back when saving fails.
function useVoiceAgent() {
  const { business, accessToken } = useAuth();

  const [enabled, setEnabled] = useState(
    business?.voiceAgentEnabled ?? true
  );
  const [isUpdating, setIsUpdating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) {
        return;
      }

      api
        .getMyBusiness(accessToken)
        .then((response) => {
          const data = response?.data || response;
          setEnabled(data?.voiceAgentEnabled ?? true);
        })
        .catch(() => {});
    }, [accessToken])
  );

  const toggle = useCallback(
    async (nextValue) => {
      setEnabled(nextValue);
      setIsUpdating(true);

      try {
        const response = await api.setVoiceAgentEnabled(
          nextValue,
          accessToken
        );
        const data = response?.data || response;
        setEnabled(data?.voiceAgentEnabled ?? nextValue);
      } catch (toggleError) {
        setEnabled(!nextValue);
        Alert.alert(
          "Instelling niet opgeslagen",
          toggleError?.message ||
            "De instelling kon niet worden gewijzigd. Probeer opnieuw."
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [accessToken]
  );

  return { enabled, isUpdating, toggle };
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

  // AI receptionist

  voiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  voiceIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },

  voiceIconOn: {
    backgroundColor: colors.primary,
  },

  voiceText: {
    flex: 1,
    gap: 2,
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
