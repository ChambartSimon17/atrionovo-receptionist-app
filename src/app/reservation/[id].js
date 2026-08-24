import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";

export default function ReservationDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { accessToken } = useAuth();

  const [reservation, setReservation] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  useEffect(() => {
    async function loadReservation() {
      if (!id || !accessToken) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response =
          await api.getReservation(
            id,
            accessToken
          );

        setReservation(response.data);
      } catch (error) {
        console.error(
          "Failed to load reservation:",
          error
        );

        setError(
          error.message ||
            "Reservatie kon niet worden geladen."
        );
      } finally {
        setLoading(false);
      }
    }

    loadReservation();
  }, [id, accessToken]);

  function formatTime(dateString) {
    if (!dateString) {
      return "-";
    }

    return new Date(
      dateString
    ).toLocaleTimeString("nl-BE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "-";
    }

    return new Date(
      dateString
    ).toLocaleDateString("nl-BE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getStatusText(status) {
    switch (status) {
      case "CONFIRMED":
        return "Bevestigd";

      case "CANCELLED":
        return "Geannuleerd";

      default:
        return status;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Reservatie
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Reservatie laden...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>
            Reservatie kon niet worden geladen
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.backAction}
            onPress={() => router.back()}
          >
            <Text style={styles.backActionText}>
              Terug
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            {reservation.firstName}{" "}
            {reservation.lastName}
          </Text>

          <Text style={styles.subtitle}>
            Reservatie
          </Text>

          <View style={styles.statusCard}>
            <Text style={styles.label}>
              Status
            </Text>

            <Text style={styles.status}>
              {getStatusText(
                reservation.status
              )}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>
              Datum
            </Text>

            <Text style={styles.value}>
              {formatDate(
                reservation.startTime
              )}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>
              Tijdstip
            </Text>

            <Text style={styles.value}>
              {formatTime(
                reservation.startTime
              )}{" "}
              –{" "}
              {formatTime(
                reservation.endTime
              )}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>
              Personen
            </Text>

            <Text style={styles.value}>
              {reservation.guestCount}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>
              Telefoon
            </Text>

            <Text style={styles.value}>
              {reservation.phoneNumber ||
                "-"}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>
              E-mail
            </Text>

            <Text style={styles.value}>
              {reservation.email || "-"}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>
              Opmerking
            </Text>

            <Text style={styles.value}>
              {reservation.notes || "-"}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },

  header: {
    height: 110,
    paddingHorizontal: 24,
    paddingTop: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: 32,
    lineHeight: 32,
    marginTop: -4,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  headerSpacer: {
    width: 42,
  },

  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    marginTop: 20,
  },

  subtitle: {
    fontSize: 16,
    color: "#888",
    marginTop: 4,
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
  },

  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#22c55e",
  },

  label: {
    fontSize: 14,
    color: "#888",
    marginBottom: 6,
  },

  value: {
    fontSize: 18,
    fontWeight: "600",
  },

  status: {
    fontSize: 20,
    fontWeight: "700",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#888",
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  errorText: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
  },

  backAction: {
    marginTop: 24,
    backgroundColor: "#111",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },

  backActionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});