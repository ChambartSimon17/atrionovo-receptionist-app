import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import { api } from "../services/api";
import { useAuth } from "../context/auth-context";
import {
  addDays,
  formatLongDate,
  formatTime,
  todayString,
} from "../utils/date";
import { formatDuration, formatPrice } from "../utils/price";

// ======================================================
// MassageAgenda
// ======================================================
//
// The appointments of one day, with arrows to browse to
// other days. A confirmed appointment can be marked as
// completed, no-show or cancelled.
// ======================================================

const STATUS_LABELS = {
  CONFIRMED: "Bevestigd",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
  NO_SHOW: "Niet verschenen",
};

export default function MassageAgenda() {
  const { accessToken, business } = useAuth();

  const businessId = business?.id;

  const [date, setDate] = useState(todayString());
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (day) => {
      try {
        setError(null);

        const response =
          await api.getMassageAppointments(
            businessId,
            day,
            accessToken
          );

        setAppointments(response.data);
      } catch (loadError) {
        setError(
          loadError.message ||
            "De afspraken konden niet worden geladen."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [businessId, accessToken]
  );

  // Reload when the screen comes back into view (for
  // example after creating an appointment) and when the
  // day changes.
  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load(date);
    }, [load, date])
  );

  async function changeStatus(appointment, status) {
    try {
      await api.updateMassageAppointment(
        businessId,
        appointment.id,
        { status },
        accessToken
      );

      await load(date);
    } catch (updateError) {
      Alert.alert(
        "Fout",
        updateError.message ||
          "De wijziging kon niet worden opgeslagen."
      );
    }
  }

  function confirmStatus(appointment, status, title, text) {
    Alert.alert(title, text, [
      { text: "Terug", style: "cancel" },
      {
        text: "Bevestigen",
        style:
          status === "CANCELLED"
            ? "destructive"
            : "default",
        onPress: () => changeStatus(appointment, status),
      },
    ]);
  }

  const isToday = date === todayString();

  return (
    <View style={styles.container}>
      <View style={styles.dayRow}>
        <Pressable
          style={styles.arrowButton}
          onPress={() => setDate(addDays(date, -1))}
          accessibilityLabel="Vorige dag"
        >
          <Text style={styles.arrow}>‹</Text>
        </Pressable>

        <Pressable
          style={styles.dayLabelBlock}
          onPress={() => setDate(todayString())}
          disabled={isToday}
        >
          <Text style={styles.dayLabel}>
            {formatLongDate(date)}
          </Text>

          <Text style={styles.daySubLabel}>
            {isToday ? "Vandaag" : "Tik voor vandaag"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.arrowButton}
          onPress={() => setDate(addDays(date, 1))}
          accessibilityLabel="Volgende dag"
        >
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : appointments.length === 0 ? (
        <Text style={styles.empty}>
          Geen afspraken op deze dag.
        </Text>
      ) : (
        appointments.map((appointment) => (
          <View
            key={appointment.id}
            style={[
              styles.card,
              (appointment.status === "CANCELLED" ||
                appointment.status === "NO_SHOW") &&
                styles.inactiveCard,
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.time}>
                {formatTime(appointment.startTime)} –{" "}
                {formatTime(appointment.endTime)}
              </Text>

              <Text style={styles.status}>
                {STATUS_LABELS[appointment.status]}
              </Text>
            </View>

            <Text style={styles.service}>
              {appointment.serviceName} ·{" "}
              {formatDuration(appointment.durationMinutes)} ·{" "}
              {formatPrice(appointment.priceCents)}
            </Text>

            <Text style={styles.customer}>
              {appointment.firstName} {appointment.lastName}{" "}
              · {appointment.phoneNumber}
            </Text>

            <Text style={styles.meta}>
              {appointment.therapistName} ·{" "}
              {appointment.roomName}
            </Text>

            {!!appointment.notes && (
              <Text style={styles.notes}>
                Notitie: {appointment.notes}
              </Text>
            )}

            {appointment.status === "CONFIRMED" && (
              <View style={styles.actions}>
                <Pressable
                  onPress={() =>
                    confirmStatus(
                      appointment,
                      "COMPLETED",
                      "Afspraak afronden?",
                      "De massage heeft plaatsgevonden."
                    )
                  }
                >
                  <Text style={styles.link}>Afgerond</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    confirmStatus(
                      appointment,
                      "NO_SHOW",
                      "Niet verschenen?",
                      "De klant is niet komen opdagen."
                    )
                  }
                >
                  <Text style={styles.link}>
                    Niet verschenen
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    confirmStatus(
                      appointment,
                      "CANCELLED",
                      "Afspraak annuleren?",
                      "Het tijdstip komt weer vrij."
                    )
                  }
                >
                  <Text style={styles.dangerLink}>
                    Annuleren
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  arrow: {
    fontSize: 26,
    color: "#111",
    marginTop: -2,
  },

  dayLabelBlock: {
    flex: 1,
    alignItems: "center",
  },

  dayLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },

  daySubLabel: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },

  loading: {
    marginVertical: 24,
  },

  error: {
    textAlign: "center",
    color: "#b3261e",
    marginVertical: 16,
  },

  empty: {
    textAlign: "center",
    color: "#888",
    fontSize: 15,
    marginVertical: 20,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },

  inactiveCard: {
    opacity: 0.55,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  time: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },

  status: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },

  service: {
    fontSize: 15,
    color: "#111",
    marginTop: 6,
  },

  customer: {
    fontSize: 15,
    color: "#111",
    marginTop: 4,
  },

  meta: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  notes: {
    fontSize: 14,
    color: "#444",
    marginTop: 8,
    fontStyle: "italic",
  },

  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    marginTop: 14,
  },

  link: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0a58ca",
  },

  dangerLink: {
    fontSize: 15,
    fontWeight: "600",
    color: "#b3261e",
  },
});
