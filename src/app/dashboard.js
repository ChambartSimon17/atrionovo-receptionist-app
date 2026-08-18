import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../context/auth-context";
import { api } from "../services/api";

export default function Dashboard() {
  const router = useRouter();

  const {
    user,
    restaurant,
    accessToken,
    logout,
  } = useAuth();

  const [reservations, setReservations] =
    useState([]);

  const [isLoadingReservations, setIsLoadingReservations] =
    useState(true);

  const [reservationError, setReservationError] =
    useState(null);

  useEffect(() => {
    loadReservations();
  }, []);

  async function loadReservations() {
    try {
      setIsLoadingReservations(true);
      setReservationError(null);

      const response =
        await api.getReservations(
          accessToken
        );

      setReservations(
        response.data || []
      );
    } catch (error) {
      setReservationError(
        error?.message ||
          "Reservaties konden niet worden geladen."
      );
    } finally {
      setIsLoadingReservations(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const today =
    new Date();

  const reservationsToday =
    reservations.filter(
      (reservation) => {
        const reservationDate =
          new Date(
            reservation.startTime
          );

        return (
          reservationDate.getFullYear() ===
            today.getFullYear() &&
          reservationDate.getMonth() ===
            today.getMonth() &&
          reservationDate.getDate() ===
            today.getDate()
        );
      }
    );

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        AtrioNovo
      </Text>

      <Text style={styles.greeting}>
        Welkom, {user?.firstName}
      </Text>

      <Text style={styles.restaurant}>
        {restaurant?.name}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Reservaties vandaag
        </Text>

        {isLoadingReservations ? (
          <ActivityIndicator
            style={styles.loader}
          />
        ) : reservationError ? (
          <Text style={styles.error}>
            {reservationError}
          </Text>
        ) : (
          <Text style={styles.number}>
            {reservationsToday.length}
          </Text>
        )}
      </View>

      {!isLoadingReservations &&
        !reservationError &&
        reservationsToday.length > 0 && (
          <View style={styles.reservations}>
            <Text style={styles.sectionTitle}>
              Vandaag
            </Text>

            {reservationsToday.map(
              (reservation) => {
                const startTime =
                  new Date(
                    reservation.startTime
                  );

                return (
                  <View
                    key={reservation.id}
                    style={
                      styles.reservationRow
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.reservationTime
                        }
                      >
                        {startTime.toLocaleTimeString(
                          "nl-BE",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </Text>

                      <Text
                        style={
                          styles.reservationName
                        }
                      >
                        {
                          reservation.firstName
                        }{" "}
                        {
                          reservation.lastName
                        }
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.guestCount
                      }
                    >
                      {
                        reservation.guestCount
                      }{" "}
                      {reservation.guestCount ===
                      1
                        ? "persoon"
                        : "personen"}
                    </Text>
                  </View>
                );
              }
            )}
          </View>
        )}

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>
          Uitloggen
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    padding: 24,
    paddingTop: 70,
  },

  logo: {
    fontSize: 18,
    fontWeight: "700",
  },

  greeting: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 40,
  },

  restaurant: {
    fontSize: 17,
    color: "#666",
    marginTop: 6,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    marginTop: 32,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  number: {
    fontSize: 42,
    fontWeight: "700",
    marginTop: 12,
  },

  loader: {
    marginTop: 18,
  },

  error: {
    color: "#d32f2f",
    marginTop: 12,
  },

  reservations: {
    marginTop: 28,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },

  reservationRow: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  reservationTime: {
    fontSize: 17,
    fontWeight: "700",
  },

  reservationName: {
    fontSize: 15,
    color: "#666",
    marginTop: 4,
  },

  guestCount: {
    fontSize: 14,
    color: "#555",
  },

  logoutButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },

  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});