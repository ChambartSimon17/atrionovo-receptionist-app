import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";

export default function EditReservation() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { accessToken } = useAuth();

  const [reservation, setReservation] =
    useState(null);

  const [date, setDate] =
    useState("");

  const [time, setTime] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

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

        const data = response.data;

        setReservation(data);

        const startTime =
          new Date(data.startTime);

        setDate(
          formatDateForInput(startTime)
        );

        setTime(
          formatTimeForInput(startTime)
        );
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

  function formatDateForInput(date) {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatTimeForInput(date) {
    const hours =
      String(
        date.getHours()
      ).padStart(2, "0");

    const minutes =
      String(
        date.getMinutes()
      ).padStart(2, "0");

    return `${hours}:${minutes}`;
  }

  function createStartTime() {
    const [year, month, day] =
      date.split("-").map(Number);

    const [hours, minutes] =
      time.split(":").map(Number);

    if (
      !year ||
      !month ||
      !day ||
      Number.isNaN(hours) ||
      Number.isNaN(minutes)
    ) {
      return null;
    }

    const startTime =
      new Date(
        year,
        month - 1,
        day,
        hours,
        minutes,
        0,
        0
      );

    return startTime.toISOString();
  }

  async function handleSave() {
    if (!id || !accessToken) {
      return;
    }

    const startTime =
      createStartTime();

    if (!startTime) {
      Alert.alert(
        "Ongeldige gegevens",
        "Controleer de datum en het tijdstip."
      );

      return;
    }

    try {
      setSaving(true);

      await api.rescheduleReservation(
        id,
        startTime,
        accessToken
      );

      Alert.alert(
        "Reservatie gewijzigd",
        "De reservatie is succesvol gewijzigd.",
        [
          {
            text: "OK",
            onPress: () =>
              router.back(),
          },
        ]
      );
    } catch (error) {
      console.error(
        "Failed to reschedule reservation:",
        error
      );

      Alert.alert(
        "Wijzigen mislukt",
        error.message ||
          "De reservatie kon niet worden gewijzigd."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Reservatie laden...
        </Text>
      </View>
    );
  }

  if (error || !reservation) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Reservatie kon niet worden geladen
        </Text>

        <Text style={styles.errorText}>
          {error ||
            "Reservatie niet gevonden."}
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            Terug
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (
    reservation.status !==
    "CONFIRMED"
  ) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Reservatie kan niet worden gewijzigd
        </Text>

        <Text style={styles.errorText}>
          Deze reservatie is{" "}
          {reservation.status.toLowerCase()}.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            Terug
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Reservatie wijzigen
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Text style={styles.title}>
          {reservation.firstName}{" "}
          {reservation.lastName}
        </Text>

        <Text style={styles.subtitle}>
          Pas de datum en het tijdstip van
          de reservatie aan.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>
            Datum
          </Text>

          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>
            Tijdstip
          </Text>

          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            style={styles.input}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            Nieuw tijdstip
          </Text>

          <Text style={styles.summaryValue}>
            {date} om {time}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            saving &&
              styles.disabledButton,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              Wijziging opslaan
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>
            Annuleren
          </Text>
        </TouchableOpacity>
      </ScrollView>
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

  headerBackButton: {
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
    lineHeight: 22,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8,
  },

  input: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
    paddingVertical: 4,
  },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
  },

  summaryLabel: {
    fontSize: 14,
    color: "#888",
    marginBottom: 6,
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },

  saveButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#087FE5",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.6,
  },

  cancelButton: {
    minHeight: 54,
    borderRadius: 16,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },

  center: {
    flex: 1,
    backgroundColor: "#f7f7f7",
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

  backButton: {
    marginTop: 24,
    backgroundColor: "#111",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },

  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});