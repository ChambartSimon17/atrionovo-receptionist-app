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

import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";

export default function ReservationCustomer() {
  const {
    date,
    startTime,
    guestCount,
  } = useLocalSearchParams();

  const { accessToken } = useAuth();

  const [query, setQuery] =
    useState("");

  const [customers, setCustomers] =
    useState([]);

  const [isSearching, setIsSearching] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [selectedCustomer, setSelectedCustomer] =
    useState(null);

  async function searchCustomers(
    searchQuery
  ) {
    const trimmedQuery =
      searchQuery.trim();

    if (!trimmedQuery) {
      setCustomers([]);
      setError(null);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);

      const response =
        await api.searchCustomers(
          trimmedQuery,
          accessToken
        );

      setCustomers(
        response?.data || []
      );
    } catch (error) {
      console.error(
        "Failed to search customers:",
        error
      );

      setError(
        error?.message ||
          "Klanten konden niet worden gezocht."
      );

      setCustomers([]);
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    const timeout =
      setTimeout(() => {
        searchCustomers(query);
      }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [query]);

  function handleSelectCustomer(
    customer
  ) {
    setSelectedCustomer(
      customer
    );
  }

  function handleNewCustomer() {
    router.push({
      pathname:
        "/reservation/new-customer",
      params: {
        date,
        startTime,
        guestCount,
      },
    });
  }

  function handleContinue() {
    if (!selectedCustomer) {
      return;
    }

    router.push({
      pathname:
        "/reservation/confirm",
      params: {
        date,
        startTime,
        guestCount,
        customerId:
          selectedCustomer.id,
      },
    });
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
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* Back */}

        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <Text
            style={styles.backButtonText}
          >
            ‹
          </Text>
        </TouchableOpacity>

        {/* Header */}

        <Text style={styles.title}>
          Klant kiezen
        </Text>

        <Text style={styles.subtitle}>
          Zoek een bestaande klant op naam
          of maak een nieuwe klant aan.
        </Text>

        {/* Reservation summary */}

        <View
          style={styles.summaryCard}
        >
          <Text
            style={styles.summaryTitle}
          >
            Reservatie
          </Text>

          <Text
            style={styles.summaryText}
          >
            {startTime}
          </Text>

          <Text
            style={styles.summaryText}
          >
            {guestCount}{" "}
            {Number(guestCount) === 1
              ? "persoon"
              : "personen"}
          </Text>
        </View>

        {/* Search */}

        <Text
          style={styles.sectionLabel}
        >
          Bestaande klant
        </Text>

        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setSelectedCustomer(null);
          }}
          placeholder="Zoek op voornaam of achternaam"
          placeholderTextColor="#999"
          autoCapitalize="words"
          autoCorrect={false}
        />

        {/* Loading */}

        {isSearching && (
          <View
            style={styles.loadingContainer}
          >
            <ActivityIndicator />
            <Text
              style={styles.loadingText}
            >
              Klanten zoeken...
            </Text>
          </View>
        )}

        {/* Error */}

        {error && (
          <View
            style={styles.errorCard}
          >
            <Text
              style={styles.errorText}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Results */}

        {!isSearching &&
          query.trim().length > 0 &&
          customers.length === 0 &&
          !error && (
            <View
              style={
                styles.emptyState
              }
            >
              <Text
                style={styles.emptyTitle}
              >
                Geen klant gevonden
              </Text>

              <Text
                style={styles.emptyText}
              >
                Deze naam staat nog niet in
                de klantenlijst.
              </Text>
            </View>
          )}

        <View
          style={styles.customerList}
        >
          {customers.map(
            (customer) => {
              const isSelected =
                selectedCustomer?.id ===
                customer.id;

              return (
                <TouchableOpacity
                  key={customer.id}
                  style={[
                    styles.customerCard,
                    isSelected &&
                      styles.customerCardSelected,
                  ]}
                  activeOpacity={0.75}
                  onPress={() =>
                    handleSelectCustomer(
                      customer
                    )
                  }
                >
                  <View
                    style={
                      styles.customerAvatar
                    }
                  >
                    <Text
                      style={
                        styles.customerAvatarText
                      }
                    >
                      {customer.firstName
                        ?.charAt(0)
                        ?.toUpperCase()}
                      {customer.lastName
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.customerInfo
                    }
                  >
                    <Text
                      style={
                        styles.customerName
                      }
                    >
                      {customer.firstName}{" "}
                      {customer.lastName}
                    </Text>

                    {customer.phoneNumber && (
                      <Text
                        style={
                          styles.customerDetail
                        }
                      >
                        {customer.phoneNumber}
                      </Text>
                    )}

                    {customer.email && (
                      <Text
                        style={
                          styles.customerDetail
                        }
                      >
                        {customer.email}
                      </Text>
                    )}
                  </View>

                  {isSelected && (
                    <Text
                      style={
                        styles.selectedIcon
                      }
                    >
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              );
            }
          )}
        </View>

        {/* New customer */}

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.8}
          onPress={handleNewCustomer}
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            + Nieuwe klant
          </Text>
        </TouchableOpacity>

        {/* Continue */}

        {selectedCustomer && (
          <TouchableOpacity
            style={
              styles.primaryButton
            }
            activeOpacity={0.8}
            onPress={
              handleContinue
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Verder met{" "}
              {selectedCustomer.firstName}
            </Text>
          </TouchableOpacity>
        )}
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

  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },

  searchInput: {
    height: 56,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: "#111",
    borderWidth: 1,
    borderColor: "#e2e2e2",
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  loadingText: {
    fontSize: 14,
    color: "#777",
    marginLeft: 8,
  },

  errorCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#f0cccc",
  },

  errorText: {
    fontSize: 14,
    color: "#c62828",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  emptyText: {
    fontSize: 14,
    color: "#777",
    marginTop: 5,
    textAlign: "center",
  },

  customerList: {
    marginTop: 16,
    gap: 10,
  },

  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
  },

  customerCardSelected: {
    borderColor: "#087FE5",
    borderWidth: 2,
  },

  customerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },

  customerAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },

  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },

  customerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  customerDetail: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },

  selectedIcon: {
    fontSize: 22,
    fontWeight: "700",
    color: "#087FE5",
    marginLeft: 10,
  },

  secondaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    marginTop: 24,
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#087FE5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});