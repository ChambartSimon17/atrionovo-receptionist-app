import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useEffect, useState } from "react";
import {
  router,
  useLocalSearchParams,
} from "expo-router";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";

export default function ReservationConfirm() {
  const {
    date,
    startTime,
    guestCount,
    customerId,
  } = useLocalSearchParams();

  const {
    accessToken,
    restaurant,
  } = useAuth();

  const [customer, setCustomer] =
    useState(null);

  const [loadingCustomer, setLoadingCustomer] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState(null);

  useEffect(() => {
    async function loadCustomer() {
      if (!customerId || !accessToken) {
        setLoadingCustomer(false);
        return;
      }

      try {
        setLoadingCustomer(true);
        setError(null);

        const response =
          await api.getCustomer(
            customerId,
            accessToken
          );

        const customerData =
          response?.data || response;

        console.log(
          "CUSTOMER FROM API:",
          JSON.stringify(
            customerData,
            null,
            2
          )
        );

        setCustomer(customerData.customer);
      } catch (error) {
        console.error(
          "Failed to load customer:",
          error
        );

        setError(
          error?.message ||
            "De klant kon niet worden geladen."
        );
      } finally {
        setLoadingCustomer(false);
      }
    }

    loadCustomer();
  }, [customerId, accessToken]);

  async function handleCreateReservation() {
    if (!accessToken) {
      setError("Je bent niet ingelogd.");
      return;
    }

    if (!restaurant?.id) {
      setError("Geen restaurant gevonden.");
      return;
    }

    if (!customer) {
      setError("Geen klant geselecteerd.");
      return;
    }

    if (!date) {
      setError("Geen datum of tijd geselecteerd.");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const reservationData = {
        restaurantId: restaurant.id,

        firstName: customer.firstName,
        lastName: customer.lastName,
        phoneNumber: customer.phoneNumber,

        email: customer.email || undefined,

        guestCount: Number(guestCount),

        startTime: date,
      };

      console.log(
        "Creating reservation:",
        reservationData
      );

      const response =
        await api.createReservation(
          reservationData,
          accessToken
        );

      const reservation =
        response?.data || response;

      const reservationId =
        reservation?.id ||
        reservation?.reservationId;

      if (!reservationId) {
        throw new Error(
          "De reservatie werd aangemaakt, maar er werd geen reservatie-ID teruggegeven."
        );
      }

      router.replace(
        `/reservation/${reservationId}`
      );
    } catch (error) {
      console.error(
        "Failed to create reservation:",
        error
      );

      setError(
        error?.message ||
          "De reservatie kon niet worden aangemaakt."
      );
    } finally {
      setCreating(false);
    }
  }

  if (loadingCustomer) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />

          <Text
            style={styles.loadingText}
          >
            Klant laden...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* Back */}

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

        {/* Header */}

        <Text style={styles.title}>
          Reservatie bevestigen
        </Text>

        <Text style={styles.subtitle}>
          Controleer de gegevens voordat
          je de reservatie aanmaakt.
        </Text>

        {/* Customer */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Klant
          </Text>

          {customer ? (
            <>
              <Text
                style={styles.customerName}
              >
                {customer.firstName}{" "}
                {customer.lastName}
              </Text>

              {customer.phoneNumber && (
                <Text
                  style={
                    styles.detailText
                  }
                >
                  {customer.phoneNumber}
                </Text>
              )}

              {customer.email && (
                <Text
                  style={
                    styles.detailText
                  }
                >
                  {customer.email}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.errorText}>
              Klantgegevens konden niet
              worden geladen.
            </Text>
          )}
        </View>

        {/* Reservation */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Reservatie
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>
              Datum
            </Text>

            <Text style={styles.value}>
              {date
                ? new Date(
                    date
                  ).toLocaleDateString(
                    "nl-BE",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )
                : "-"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Tijd
            </Text>

            <Text style={styles.value}>
              {startTime || "-"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Personen
            </Text>

            <Text style={styles.value}>
              {guestCount}{" "}
              {Number(guestCount) === 1
                ? "persoon"
                : "personen"}
            </Text>
          </View>
        </View>

        {/* Error */}

        {error && (
          <View
            style={styles.errorCard}
          >
            <Text
              style={styles.errorTitle}
            >
              Reservatie mislukt
            </Text>

            <Text
              style={styles.errorText}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Confirm */}

        <TouchableOpacity
          style={[
            styles.confirmButton,
            creating &&
              styles.disabledButton,
          ]}
          activeOpacity={0.8}
          onPress={
            handleCreateReservation
          }
          disabled={
            creating || !customer
          }
        >
          {creating ? (
            <ActivityIndicator
              color="#fff"
            />
          ) : (
            <Text
              style={
                styles.confirmButtonText
              }
            >
              Reservatie bevestigen
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          activeOpacity={0.8}
          onPress={() => router.back()}
          disabled={creating}
        >
          <Text
            style={
              styles.cancelButtonText
            }
          >
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

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#777",
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

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
  },

  customerName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },

  detailText: {
    fontSize: 14,
    color: "#777",
    marginTop: 5,
  },

  row: {
    marginTop: 12,
  },

  label: {
    fontSize: 13,
    color: "#888",
    marginBottom: 4,
  },

  value: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },

  errorCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0cccc",
  },

  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#c62828",
  },

  errorText: {
    fontSize: 14,
    color: "#c62828",
    marginTop: 5,
  },

  confirmButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#087FE5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  confirmButtonText: {
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