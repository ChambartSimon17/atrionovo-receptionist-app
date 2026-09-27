import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useState } from "react";
import {
  router,
  useLocalSearchParams,
} from "expo-router";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";

export default function NewCustomer() {
  const {
    date,
    startTime,
    guestCount,
  } = useLocalSearchParams();

  const {
    accessToken,
    restaurant,
  } = useAuth();

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState(null);

  async function handleCreateCustomer() {
    if (!accessToken) {
      setError("Je bent niet ingelogd.");
      return;
    }

    if (!restaurant?.id) {
      setError("Geen restaurant gevonden.");
      return;
    }

    if (!firstName.trim()) {
      setError("Vul een voornaam in.");
      return;
    }

    if (!lastName.trim()) {
      setError("Vul een achternaam in.");
      return;
    }

    if (!phoneNumber.trim()) {
      setError("Vul een telefoonnummer in.");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const response =
        await api.createCustomer(
          {
            restaurantId: restaurant.id,

            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phoneNumber: phoneNumber.trim(),
            email: email.trim() || undefined,
          },
          accessToken
        );

      const customer =
        response?.data || response;

      const customerId =
        customer?.id ||
        customer?.customer?.id;

      if (!customerId) {
        throw new Error(
          "De klant werd aangemaakt, maar er werd geen klant-ID teruggegeven."
        );
      }

      router.replace({
        pathname: "/reservation/confirm",
        params: {
          date,
          startTime,
          guestCount,
          customerId,
        },
      });
    } catch (error) {
      console.error(
        "Failed to create customer:",
        error
      );

      setError(
        error?.message ||
          "De klant kon niet worden aangemaakt."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => router.back()}
          disabled={creating}
        >
          <Text
            style={styles.backButtonText}
          >
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Nieuwe klant
        </Text>

        <Text style={styles.subtitle}>
          Vul de gegevens van de nieuwe
          klant in.
        </Text>

        {/* Reservation summary */}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            Reservatie
          </Text>

          <Text style={styles.summaryText}>
            {startTime}
          </Text>

          <Text style={styles.summaryText}>
            {guestCount}{" "}
            {Number(guestCount) === 1
              ? "persoon"
              : "personen"}
          </Text>
        </View>

        {/* First name */}

        <View style={styles.field}>
          <Text style={styles.label}>
            Voornaam
          </Text>

          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Voornaam"
            placeholderTextColor="#999"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* Last name */}

        <View style={styles.field}>
          <Text style={styles.label}>
            Achternaam
          </Text>

          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Achternaam"
            placeholderTextColor="#999"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* Phone */}

        <View style={styles.field}>
          <Text style={styles.label}>
            Telefoonnummer
          </Text>

          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+32..."
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>

        {/* Email */}

        <View style={styles.field}>
          <Text style={styles.label}>
            E-mail
          </Text>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Error */}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        {/* Create */}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            creating &&
              styles.disabledButton,
          ]}
          activeOpacity={0.8}
          onPress={
            handleCreateCustomer
          }
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Klant aanmaken
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          activeOpacity={0.8}
          onPress={() => router.back()}
          disabled={creating}
        >
          <Text style={styles.cancelButtonText}>
            Terug
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },

  content: {
    padding: 24,
    paddingBottom: 50,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  backButtonText: {
    fontSize: 32,
    lineHeight: 34,
    color: "#111",
    marginTop: -3,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
  },

  subtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 6,
    marginBottom: 28,
  },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 28,
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },

  summaryText: {
    fontSize: 15,
    color: "#666",
    marginTop: 5,
  },

  field: {
    marginBottom: 18,
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },

  input: {
    height: 56,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: "#111",
    borderWidth: 1,
    borderColor: "#e2e2e2",
  },

  errorCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0cccc",
  },

  errorText: {
    fontSize: 14,
    color: "#c62828",
  },

  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#087FE5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  disabledButton: {
    opacity: 0.6,
  },

  cancelButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
});