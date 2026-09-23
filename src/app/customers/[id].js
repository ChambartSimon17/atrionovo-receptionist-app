import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { api } from "../../../src/services/api";
import { useAuth } from "../../../src/context/auth-context";


// ======================================================
// Helpers
// ======================================================

function formatDate(dateString) {
  if (!dateString) {
    return "-";
  }

  return new Date(dateString).toLocaleDateString(
    "nl-BE",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatTime(dateString) {
  if (!dateString) {
    return "-";
  }

  return new Date(dateString).toLocaleTimeString(
    "nl-BE",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
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
// Customer Detail
// ======================================================

export default function CustomerDetail() {
  const router = useRouter();

  const { id } = useLocalSearchParams();

  const {
    accessToken,
  } = useAuth();

  const [customer, setCustomer] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState(null);


  // ====================================================
  // Load customer
  // ====================================================

  const loadCustomer = useCallback(
    async () => {
      if (
        !accessToken ||
        !id
      ) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response =
          await api.getCustomer(
            id,
            accessToken
          );

        const data =
          response?.data ||
          response;

        setCustomer({
          ...data.customer,
          reservations:
            data.reservations || [],
        });
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
        setIsLoading(false);
      }
    },
    [
      accessToken,
      id,
    ]
  );


  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);


  // ====================================================
  // Loading
  // ====================================================

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }


  // ====================================================
  // Error
  // ====================================================

  if (error) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.center}>
          <Text style={styles.errorTitle}>
            Klant niet gevonden
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={styles.backButtonText}
            >
              Terug
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }


  if (!customer) {
    return null;
  }


  // ====================================================
  // Render
  // ====================================================

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >

        {/* Header */}

        <View style={styles.header}>

          <Pressable
            onPress={() =>
              router.back()
            }
            style={styles.back}
          >
            <Text style={styles.backIcon}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text
              style={styles.title}
            >
              {customer.firstName}{" "}
              {customer.lastName}
            </Text>

            <Text
              style={styles.subtitle}
            >
              Klant
            </Text>
          </View>

          {customer.isVip && (
            <View
              style={styles.vipBadge}
            >
              <Text
                style={styles.vipText}
              >
                VIP
              </Text>
            </View>
          )}

        </View>


        {/* Contact information */}

        <View style={styles.card}>

          <Text style={styles.sectionTitle}>
            Contactgegevens
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Telefoon
            </Text>

            <Text style={styles.value}>
              {customer.phoneNumber ||
                "-"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              E-mail
            </Text>

            <Text style={styles.value}>
              {customer.email ||
                "-"}
            </Text>
          </View>

        </View>


        {/* Customer information */}

        <View style={styles.card}>

          <Text style={styles.sectionTitle}>
            Klantinformatie
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              VIP
            </Text>

            <Text style={styles.value}>
              {customer.isVip
                ? "Ja"
                : "Nee"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.notesContainer}>
            <Text style={styles.label}>
              Notities
            </Text>

            <Text style={styles.notes}>
              {customer.notes ||
                "Geen notities"}
            </Text>
          </View>

        </View>


        {/* Reservations */}

        <View style={styles.card}>

          <View
            style={
              styles.reservationHeader
            }
          >
            <Text
              style={styles.sectionTitle}
            >
              Reservaties
            </Text>

            <Text
              style={styles.reservationCount}
            >
              {customer.reservations
                ?.length || 0}
            </Text>
          </View>


          {!customer.reservations ||
          customer.reservations.length ===
            0 ? (
            <Text
              style={
                styles.emptyReservations
              }
            >
              Geen reservaties gevonden.
            </Text>
          ) : (
            customer.reservations.map(
              (reservation) => (
                <Pressable
                  key={
                    reservation.id
                  }
                  style={
                    styles.reservationRow
                  }
                  onPress={() =>
                    router.push(
                      `/reservation/${reservation.id}`
                    )
                  }
                >

                  <View>
                    <Text
                      style={
                        styles.reservationDate
                      }
                    >
                      {formatDate(
                        reservation.startTime
                      )}
                    </Text>

                    <Text
                      style={
                        styles.reservationMeta
                      }
                    >
                      {formatTime(
                        reservation.startTime
                      )}{" "}
                      ·{" "}
                      {formatGuestCount(
                        reservation.guestCount
                      )}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.chevron
                    }
                  >
                    ›
                  </Text>

                </Pressable>
              )
            )
          )}

        </View>

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
    backgroundColor: "#F5F6F8",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  backIcon: {
    fontSize: 30,
    lineHeight: 32,
    color: "#111",
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111",
  },

  subtitle: {
    marginTop: 3,
    fontSize: 14,
    color: "#777",
  },

  vipBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#111",
  },

  vipText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
    marginBottom: 14,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },

  label: {
    fontSize: 14,
    color: "#777",
  },

  value: {
    flex: 1,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },

  divider: {
    height: 1,
    backgroundColor: "#ECEDEF",
    marginVertical: 14,
  },

  notesContainer: {
    gap: 8,
  },

  notes: {
    fontSize: 15,
    lineHeight: 22,
    color: "#222",
  },

  reservationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  reservationCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0F1F3",
    textAlign: "center",
    paddingTop: 5,
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },

  reservationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#ECEDEF",
  },

  reservationDate: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },

  reservationMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#777",
  },

  chevron: {
    fontSize: 25,
    color: "#999",
  },

  emptyReservations: {
    fontSize: 14,
    color: "#888",
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },

  errorText: {
    textAlign: "center",
    fontSize: 14,
    color: "#777",
    marginBottom: 20,
  },

  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#111",
  },

  backButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});