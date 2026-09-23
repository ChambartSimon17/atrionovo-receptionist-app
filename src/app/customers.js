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

import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  useCallback,
  useState,
} from "react";

import { useAuth } from "../context/auth-context";
import { api } from "../services/api";

export default function Customers() {
  const {
    accessToken,
  } = useAuth();

  const [
    customers,
    setCustomers,
  ] = useState([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState(null);

  const loadCustomers =
    useCallback(
      async () => {
        if (!accessToken) {
          return;
        }

        try {
          setIsLoading(true);
          setError(null);

          const response =
            await api.getCustomers(
              accessToken
            );

          const data =
            response?.data ||
            response ||
            [];

          setCustomers(data);
        } catch (error) {
          console.error(
            "Failed to load customers:",
            error
          );

          setError(
            error?.message ||
              "De klanten konden niet worden geladen."
          );
        } finally {
          setIsLoading(false);
        }
      },
      [accessToken]
    );

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [loadCustomers])
  );

  const filteredCustomers =
    customers.filter(
      (customer) => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return true;
        }

        const fullName =
          `${customer.firstName} ${customer.lastName}`
            .toLowerCase();

        return (
          fullName.includes(query) ||
          customer.phoneNumber
            ?.toLowerCase()
            .includes(query) ||
          customer.email
            ?.toLowerCase()
            .includes(query)
        );
      }
    );

  if (isLoading) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Klanten laden...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* Header */}

        <View
          style={
            styles.header
          }
        >
          <View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                router.back()
              }
            >
              <Text
                style={
                  styles.backButton
                }
              >
                ‹ Terug
              </Text>
            </TouchableOpacity>

            <Text
              style={
                styles.title
              }
            >
              Klanten
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              {customers.length}{" "}
              {customers.length === 1
                ? "klant"
                : "klanten"}
            </Text>
          </View>

        </View>

        {/* Search */}

        <TextInput
          value={search}
          onChangeText={
            setSearch
          }
          placeholder="Zoek op naam, telefoon of e-mail"
          placeholderTextColor="#999"
          style={
            styles.searchInput
          }
        />

        {/* Error */}

        {error && (
          <View
            style={
              styles.errorContainer
            }
          >
            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>

            <TouchableOpacity
              onPress={
                loadCustomers
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Opnieuw proberen
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Customer list */}

        <View
          style={
            styles.customerList
          }
        >
          {filteredCustomers.length ===
          0 ? (
            <View
              style={
                styles.emptyState
              }
            >
              <Text
                style={
                  styles.emptyTitle
                }
              >
                Geen klanten gevonden
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {search
                  ? "Probeer een andere zoekterm."
                  : "Er zijn nog geen klanten geregistreerd."}
              </Text>
            </View>
          ) : (
            filteredCustomers.map(
              (customer) => (
                <TouchableOpacity
                  key={
                    customer.id
                  }
                  activeOpacity={
                    0.75
                  }
                  style={
                    styles.customerCard
                  }
                  onPress={() =>
                    router.push(
                      `/customers/${customer.id}`
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
                      {customer.firstName?.[0]}
                      {customer.lastName?.[0]}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.customerMain
                    }
                  >
                    <View
                      style={
                        styles.customerNameRow
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

                      {customer.isVip && (
                        <View
                          style={
                            styles.vipBadge
                          }
                        >
                          <Text
                            style={
                              styles.vipBadgeText
                            }
                          >
                            VIP
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={
                        styles.customerPhone
                      }
                    >
                      {customer.phoneNumber}
                    </Text>

                    {customer.email && (
                      <Text
                        style={
                          styles.customerEmail
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {customer.email}
                      </Text>
                    )}
                  </View>

                  <Text
                    style={
                      styles.customerArrow
                    }
                  >
                    ›
                  </Text>
                </TouchableOpacity>
              )
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#f7f7f7",
    },

    content: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 40,
    },

    loadingContainer: {
      flex: 1,
      backgroundColor:
        "#f7f7f7",
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 15,
      color: "#666",
    },

    header: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent:
        "space-between",
    },

    backButton: {
      fontSize: 14,
      fontWeight: "600",
      color: "#666",
      marginBottom: 14,
    },

    title: {
      fontSize: 30,
      fontWeight: "700",
      color: "#111",
    },

    subtitle: {
      fontSize: 14,
      color: "#777",
      marginTop: 4,
    },

    searchInput: {
      height: 48,
      backgroundColor: "#fff",
      borderRadius: 12,
      paddingHorizontal: 15,
      fontSize: 15,
      color: "#111",
      marginTop: 24,
      borderWidth: 1,
      borderColor: "#e5e5e5",
    },

    customerList: {
      gap: 10,
      marginTop: 18,
    },

    customerCard: {
      backgroundColor: "#fff",
      borderRadius: 16,
      padding: 15,
      flexDirection: "row",
      alignItems: "center",
    },

    customerAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#111",
      alignItems: "center",
      justifyContent: "center",
    },

    customerAvatarText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },

    customerMain: {
      flex: 1,
      marginLeft: 13,
    },

    customerNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    customerName: {
      fontSize: 16,
      fontWeight: "700",
      color: "#111",
    },

    customerPhone: {
      fontSize: 14,
      color: "#666",
      marginTop: 4,
    },

    customerEmail: {
      fontSize: 13,
      color: "#888",
      marginTop: 2,
    },

    vipBadge: {
      backgroundColor: "#fff4d6",
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },

    vipBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#8a6200",
    },

    customerArrow: {
      fontSize: 28,
      color: "#aaa",
      marginLeft: 10,
    },

    emptyState: {
      backgroundColor: "#fff",
      borderRadius: 16,
      padding: 30,
      alignItems: "center",
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#111",
    },

    emptyText: {
      fontSize: 14,
      color: "#777",
      textAlign: "center",
      marginTop: 6,
    },

    errorContainer: {
      backgroundColor: "#fff",
      borderRadius: 14,
      padding: 16,
      marginTop: 16,
    },

    errorText: {
      color: "#c62828",
      fontSize: 14,
    },

    retryText: {
      color: "#087FE5",
      fontSize: 14,
      fontWeight: "700",
      marginTop: 8,
    },
  });