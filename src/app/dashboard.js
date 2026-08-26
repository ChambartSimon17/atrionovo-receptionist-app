import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { router, useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../context/auth-context";
import { api } from "../services/api";

// ======================================================
// Service configuration
// ======================================================
//
// Pas deze tijden aan wanneer de openingsuren van een
// restaurant anders zijn.
//
// De starttijd is inclusief.
// De eindtijd is exclusief.
//
// Bijvoorbeeld:
// 15:00 hoort niet meer bij de middagservice.
// ======================================================

const SERVICES = {
  lunch: {
    key: "lunch",
    title: "Middagservice",
    subtitle: "12:00 – 15:00",
    startHour: 12,
    startMinute: 0,
    endHour: 15,
    endMinute: 0,
  },

  dinner: {
    key: "dinner",
    title: "Avondservice",
    subtitle: "18:00 – 22:00",
    startHour: 18,
    startMinute: 0,
    endHour: 22,
    endMinute: 0,
  },
};

// ======================================================
// Helpers
// ======================================================

function isSameDay(date, referenceDate) {
  return (
    date.getFullYear() ===
      referenceDate.getFullYear() &&
    date.getMonth() ===
      referenceDate.getMonth() &&
    date.getDate() ===
      referenceDate.getDate()
  );
}

function getMinutesSinceMidnight(date) {
  return (
    date.getHours() * 60 +
    date.getMinutes()
  );
}

function isInsideService(
  date,
  service
) {
  const minutes =
    getMinutesSinceMidnight(date);

  const start =
    service.startHour * 60 +
    service.startMinute;

  const end =
    service.endHour * 60 +
    service.endMinute;

  return (
    minutes >= start &&
    minutes < end
  );
}

function formatTime(date) {
  return date.toLocaleTimeString(
    "nl-BE",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
}

function formatDate(date) {
  return date.toLocaleDateString(
    "nl-BE",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  );
}

function formatGuestCount(count) {
  if (count === 1) {
    return "1 persoon";
  }

  return `${count} personen`;
}

// ======================================================
// Reservation Card
// ======================================================

function ReservationCard({
  reservation,
}) {
  const startTime =
    new Date(reservation.startTime);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={styles.reservationCard}
      onPress={() =>
        router.push(
          `/reservation/${reservation.id}`
        )
      }
    >
      <View style={styles.timeColumn}>
        <Text style={styles.reservationTime}>
          {formatTime(startTime)}
        </Text>
      </View>

      <View style={styles.reservationMain}>
        <Text
          style={styles.reservationName}
          numberOfLines={1}
        >
          {reservation.firstName}{" "}
          {reservation.lastName}
        </Text>

        <Text style={styles.reservationMeta}>
          {formatGuestCount(
            reservation.guestCount
          )}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <View style={styles.confirmedDot} />

        <Text style={styles.statusText}>
          Bevestigd
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ======================================================
// Service Section
// ======================================================

function ServiceSection({
  service,
  reservations,
}) {
  return (
    <View style={styles.serviceSection}>
      <View style={styles.serviceHeader}>
        <View>
          <Text style={styles.serviceTitle}>
            {service.title}
          </Text>

          <Text style={styles.serviceSubtitle}>
            {service.subtitle}
          </Text>
        </View>

        <View style={styles.serviceCount}>
          <Text style={styles.serviceCountNumber}>
            {reservations.length}
          </Text>

          <Text style={styles.serviceCountLabel}>
            {reservations.length === 1
              ? "reservatie"
              : "reservaties"}
          </Text>
        </View>
      </View>

      {reservations.length === 0 ? (
        <View style={styles.emptyService}>
          <Text style={styles.emptyServiceText}>
            Geen reservaties
          </Text>
        </View>
      ) : (
        <View style={styles.reservationList}>
          {reservations.map(
            (reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={
                  reservation
                }
              />
            )
          )}
        </View>
      )}
    </View>
  );
}

// ======================================================
// Dashboard
// ======================================================

export default function Dashboard() {
  const {
    user,
    restaurant,
    accessToken,
    logout,
  } = useAuth();

  const { width } =
    useWindowDimensions();

  const isLandscape =
    width > 700;

  const [reservations, setReservations] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState(null);

  // ====================================================
  // Fetch reservations
  // ====================================================

  const loadReservations =
    useCallback(
      async (refresh = false) => {
        if (!accessToken) {
          return;
        }

        try {
          if (refresh) {
            setIsRefreshing(true);
          } else {
            setIsLoading(true);
          }

          setError(null);

          const response =
            await api.getReservations(
              accessToken
            );

          setReservations(
            response?.data || []
          );
        } catch (error) {
          console.error(
            "Failed to load reservations:",
            error
          );

          setError(
            error?.message ||
              "Reservaties konden niet worden geladen."
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [accessToken]
    );

  useFocusEffect(
    useCallback(() => {
      loadReservations(true);
    }, [loadReservations])
  );

  // ====================================================
  // Today's reservations
  // ====================================================

  const today =
    useMemo(
      () => new Date(),
      []
    );

  const todaysReservations =
    useMemo(() => {
      return reservations
        .filter(
          (reservation) => {
            if (
              reservation.status !==
              "CONFIRMED"
            ) {
              return false;
            }

            const startTime =
              new Date(
                reservation.startTime
              );

            return isSameDay(
              startTime,
              today
            );
          }
        )
        .sort(
          (a, b) =>
            new Date(
              a.startTime
            ) -
            new Date(
              b.startTime
            )
        );
    }, [reservations, today]);

  // ====================================================
  // Split reservations by service
  // ====================================================

  const lunchReservations =
    useMemo(() => {
      return todaysReservations.filter(
        (reservation) => {
          const date =
            new Date(
              reservation.startTime
            );

          return isInsideService(
            date,
            SERVICES.lunch
          );
        }
      );
    }, [todaysReservations]);

  const dinnerReservations =
    useMemo(() => {
      return todaysReservations.filter(
        (reservation) => {
          const date =
            new Date(
              reservation.startTime
            );

          return isInsideService(
            date,
            SERVICES.dinner
          );
        }
      );
    }, [todaysReservations]);

  const totalReservations =
    lunchReservations.length +
    dinnerReservations.length;

  // ====================================================
  // Loading
  // ====================================================

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
        />

        <Text style={styles.loadingText}>
          Reservaties laden...
        </Text>
      </SafeAreaView>
    );
  }

  // ====================================================
  // Dashboard
  // ====================================================

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape &&
            styles.scrollContentLandscape,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={
              isRefreshing
            }
            onRefresh={() =>
              loadReservations(true)
            }
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* ============================================
            Header
        ============================================ */}

        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>
              AtrioNovo
            </Text>

            <Text style={styles.greeting}>
              Welkom,{" "}
              {user?.firstName ||
                "gebruiker"}
            </Text>

            <Text
              style={
                styles.restaurantName
              }
            >
              {restaurant?.name ||
                ""}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            activeOpacity={0.7}
            onPress={() =>
              router.push("/settings")
            }
          >
            <Text
              style={
                styles.settingsIcon
              }
            >
              ⚙
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================
            Date + total
        ============================================ */}

        <View style={styles.dateRow}>
          <View>
            <Text style={styles.date}>
              {formatDate(today)}
            </Text>

            <Text
              style={styles.dateSubtitle}
            >
              Vandaag
            </Text>
          </View>

          <View style={styles.totalContainer}>
            <Text
              style={styles.totalNumber}
            >
              {totalReservations}
            </Text>

            <Text
              style={styles.totalLabel}
            >
              {totalReservations ===
              1
                ? "reservatie"
                : "reservaties"}
            </Text>
          </View>
        </View>

        {/* ============================================
            Error
        ============================================ */}

        {error && (
          <View
            style={styles.errorContainer}
          >
            <Text
              style={styles.errorTitle}
            >
              Er ging iets mis
            </Text>

            <Text
              style={styles.errorText}
            >
              {error}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() =>
                loadReservations()
              }
            >
              <Text
                style={styles.retryText}
              >
                Opnieuw proberen
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================
            Service overview
        ============================================ */}

        <View
          style={[
            styles.serviceOverview,
            isLandscape &&
              styles.serviceOverviewLandscape,
          ]}
        >
          <View
            style={[
              styles.serviceOverviewCard,
              isLandscape &&
                styles.serviceOverviewCardLandscape,
            ]}
          >
            <Text
              style={
                styles.overviewLabel
              }
            >
              Middagservice
            </Text>

            <Text
              style={
                styles.overviewNumber
              }
            >
              {lunchReservations.length}
            </Text>

            <Text
              style={
                styles.overviewSubtitle
              }
            >
              12:00 – 15:00
            </Text>
          </View>

          <View
            style={[
              styles.serviceOverviewCard,
              isLandscape &&
                styles.serviceOverviewCardLandscape,
            ]}
          >
            <Text
              style={
                styles.overviewLabel
              }
            >
              Avondservice
            </Text>

            <Text
              style={
                styles.overviewNumber
              }
            >
              {dinnerReservations.length}
            </Text>

            <Text
              style={
                styles.overviewSubtitle
              }
            >
              18:00 – 22:00
            </Text>
          </View>
        </View>

        {/* ============================================
            Reservations
        ============================================ */}

        <View style={styles.sectionHeader}>
          <Text
            style={styles.sectionTitle}
          >
            Reservaties
          </Text>

          <Text
            style={styles.sectionSubtitle}
          >
            Vandaag
          </Text>
        </View>

        <ServiceSection
          service={SERVICES.lunch}
          reservations={
            lunchReservations
          }
        />

        <ServiceSection
          service={SERVICES.dinner}
          reservations={
            dinnerReservations
          }
        />

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          <Text style={styles.logoutText}>
            Uitloggen
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ======================================================
// Styles
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },

  scrollContentLandscape: {
    paddingHorizontal: 40,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },

  // ====================================================
  // Loading
  // ====================================================

  loadingContainer: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
  },

  // ====================================================
  // Header
  // ====================================================

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  logo: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
  },

  greeting: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111",
    marginTop: 34,
  },

  restaurantName: {
    fontSize: 17,
    color: "#666",
    marginTop: 5,
  },

  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#087FE5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },

  settingsIcon: {
    fontSize: 25,
    color: "#fff",
  },

  // ====================================================
  // Date
  // ====================================================

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 34,
  },

  date: {
    fontSize: 21,
    fontWeight: "700",
    color: "#111",
    textTransform: "capitalize",
  },

  dateSubtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },

  totalContainer: {
    alignItems: "flex-end",
  },

  totalNumber: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111",
  },

  totalLabel: {
    fontSize: 13,
    color: "#777",
  },

  // ====================================================
  // Error
  // ====================================================

  errorContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#f0cccc",
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#c62828",
  },

  errorText: {
    fontSize: 14,
    color: "#666",
    marginTop: 6,
  },

  retryButton: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#111",
  },

  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // ====================================================
  // Service overview
  // ====================================================

  serviceOverview: {
    flexDirection: "row",
    gap: 14,
    marginTop: 28,
  },

  serviceOverviewLandscape: {
    gap: 20,
  },

  serviceOverviewCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    minHeight: 150,
    justifyContent: "center",
  },

  serviceOverviewCardLandscape: {
    minHeight: 170,
    padding: 26,
  },

  overviewLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },

  overviewNumber: {
    fontSize: 42,
    fontWeight: "700",
    color: "#111",
    marginTop: 8,
  },

  overviewSubtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 2,
  },

  // ====================================================
  // Reservations header
  // ====================================================

  sectionHeader: {
    marginTop: 36,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },

  sectionSubtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 3,
  },

  // ====================================================
  // Service
  // ====================================================

  serviceSection: {
    marginBottom: 30,
  },

  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  serviceTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
  },

  serviceSubtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },

  serviceCount: {
    alignItems: "flex-end",
  },

  serviceCountNumber: {
    fontSize: 21,
    fontWeight: "700",
    color: "#111",
  },

  serviceCountLabel: {
    fontSize: 12,
    color: "#777",
  },

  // ====================================================
  // Reservation list
  // ====================================================

  reservationList: {
    gap: 10,
  },

  reservationCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  timeColumn: {
    width: 62,
  },

  reservationTime: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },

  reservationMain: {
    flex: 1,
    marginLeft: 8,
  },

  reservationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  reservationMeta: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },

  confirmedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22a06b",
    marginRight: 6,
  },

  statusText: {
    fontSize: 12,
    color: "#777",
  },

  // ====================================================
  // Empty service
  // ====================================================

  emptyService: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },

  emptyServiceText: {
    fontSize: 14,
    color: "#999",
  },

  // ====================================================
  // Logout button
  // ====================================================

  logoutButton: {
    backgroundColor: "#111",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },

  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});