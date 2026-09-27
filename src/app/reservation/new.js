import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMemo, useState } from "react";
import { router } from "expo-router";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";

function formatDate(date) {
  return date.toLocaleDateString("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(date) {
  return date.toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatAlternativeTime(
  startTime
) {
  return formatTime(
    new Date(startTime)
  );
}

export default function NewReservation() {
  const {
    restaurant,
  } = useAuth();

  const [selectedDate, setSelectedDate] =
    useState(() => new Date());

  const [selectedHour, setSelectedHour] =
    useState(19);

  const [selectedMinute, setSelectedMinute] =
    useState(0);

  const [guestCount, setGuestCount] =
    useState(2);

  const [
    availability,
    setAvailability,
  ] = useState(null);

  const [
    isChecking,
    setIsChecking,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);

  const selectedStartTime = useMemo(() => {
    const date = new Date(
      selectedDate
    );

    date.setHours(
      selectedHour,
      selectedMinute,
      0,
      0
    );

    return date;
  }, [
    selectedDate,
    selectedHour,
    selectedMinute,
  ]);

  async function handleCheckAvailability() {
    if (!restaurant?.id) {
      setError(
        "Geen restaurant gevonden."
      );

      return;
    }

    try {
      setIsChecking(true);
      setError(null);
      setAvailability(null);

      const response =
        await api.checkAvailability(
          restaurant.id,
          guestCount,
          selectedStartTime.toISOString()
        );

      setAvailability(
        response?.data || response
      );
    } catch (error) {
      console.error(
        "Failed to check availability:",
        error
      );

      setError(
        error?.message ||
          "De beschikbaarheid kon niet worden gecontroleerd."
      );
    } finally {
      setIsChecking(false);
    }
  }

  function increaseGuests() {
    setGuestCount(
      (current) => current + 1
    );

    setAvailability(null);
  }

  function decreaseGuests() {
    setGuestCount((current) =>
      Math.max(1, current - 1)
    );

    setAvailability(null);
  }

  function changeDate(amount) {
    setSelectedDate(
      (currentDate) => {
        const nextDate =
          new Date(currentDate);

        nextDate.setDate(
          nextDate.getDate() + amount
        );

        return nextDate;
      }
    );

    setAvailability(null);
  }

  function changeTime(amount) {
    const nextMinutes =
      selectedHour * 60 +
      selectedMinute +
      amount;

    const normalizedMinutes =
      Math.max(
        0,
        Math.min(
          23 * 60 + 45,
          nextMinutes
        )
      );

    setSelectedHour(
      Math.floor(
        normalizedMinutes / 60
      )
    );

    setSelectedMinute(
      normalizedMinutes % 60
    );

    setAvailability(null);
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
        {/* Header */}

        <View style={styles.header}>
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

          <View>
            <Text style={styles.title}>
              Nieuwe reservatie
            </Text>

            <Text
              style={styles.subtitle}
            >
              Controleer eerst de
              beschikbaarheid.
            </Text>
          </View>
        </View>

        {/* Date */}

        <View style={styles.section}>
          <Text
            style={styles.sectionLabel}
          >
            Datum
          </Text>

          <View
            style={
              styles.navigationRow
            }
          >
            <TouchableOpacity
              style={
                styles.navigationButton
              }
              activeOpacity={0.7}
              onPress={() =>
                changeDate(-1)
              }
            >
              <Text
                style={
                  styles.navigationArrow
                }
              >
                ‹
              </Text>
            </TouchableOpacity>

            <View
              style={
                styles.selectedValue
              }
            >
              <Text
                style={
                  styles.selectedValueText
                }
              >
                {formatDate(
                  selectedDate
                )}
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.navigationButton
              }
              activeOpacity={0.7}
              onPress={() =>
                changeDate(1)
              }
            >
              <Text
                style={
                  styles.navigationArrow
                }
              >
                ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Time */}

        <View style={styles.section}>
          <Text
            style={styles.sectionLabel}
          >
            Tijd
          </Text>

          <View
            style={
              styles.navigationRow
            }
          >
            <TouchableOpacity
              style={
                styles.navigationButton
              }
              activeOpacity={0.7}
              onPress={() =>
                changeTime(-15)
              }
            >
              <Text
                style={
                  styles.navigationArrow
                }
              >
                −
              </Text>
            </TouchableOpacity>

            <View
              style={
                styles.selectedValue
              }
            >
              <Text
                style={
                  styles.timeValue
                }
              >
                {formatTime(
                  selectedStartTime
                )}
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.navigationButton
              }
              activeOpacity={0.7}
              onPress={() =>
                changeTime(15)
              }
            >
              <Text
                style={
                  styles.navigationArrow
                }
              >
                +
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={styles.helperText}
          >
            Per 15 minuten
          </Text>
        </View>

        {/* Guests */}

        <View style={styles.section}>
          <Text
            style={styles.sectionLabel}
          >
            Aantal personen
          </Text>

          <View
            style={
              styles.guestSelector
            }
          >
            <TouchableOpacity
              style={
                styles.guestButton
              }
              activeOpacity={0.7}
              onPress={
                decreaseGuests
              }
              disabled={
                guestCount <= 1
              }
            >
              <Text
                style={
                  styles.guestButtonText
                }
              >
                −
              </Text>
            </TouchableOpacity>

            <View
              style={
                styles.guestValue
              }
            >
              <Text
                style={
                  styles.guestNumber
                }
              >
                {guestCount}
              </Text>

              <Text
                style={
                  styles.guestLabel
                }
              >
                {guestCount === 1
                  ? "persoon"
                  : "personen"}
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.guestButton
              }
              activeOpacity={0.7}
              onPress={
                increaseGuests
              }
            >
              <Text
                style={
                  styles.guestButtonText
                }
              >
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Check availability */}

        <TouchableOpacity
          style={[
            styles.checkButton,
            isChecking &&
              styles.checkButtonDisabled,
          ]}
          activeOpacity={0.8}
          disabled={isChecking}
          onPress={
            handleCheckAvailability
          }
        >
          {isChecking ? (
            <ActivityIndicator
              color="#fff"
            />
          ) : (
            <Text
              style={
                styles.checkButtonText
              }
            >
              Controleer beschikbaarheid
            </Text>
          )}
        </TouchableOpacity>

        {/* Error */}

        {error && (
          <View
            style={styles.errorCard}
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
          </View>
        )}

        {/* Availability result */}

        {availability && (
          <View
            style={
              styles.resultContainer
            }
          >
            {availability.available ? (
              <View
                style={
                  styles.availableCard
                }
              >
                <Text
                  style={
                    styles.availableIcon
                  }
                >
                  ✓
                </Text>

                <Text
                  style={
                    styles.resultTitle
                  }
                >
                  Beschikbaar
                </Text>

                <Text
                  style={
                    styles.resultSubtitle
                  }
                >
                  {formatTime(
                    selectedStartTime
                  )}{" "}
                  ·{" "}
                  {guestCount}{" "}
                  {guestCount === 1
                    ? "persoon"
                    : "personen"}
                </Text>

                <TouchableOpacity
                  style={
                    styles.continueButton
                  }
                  activeOpacity={0.8}
                  onPress={() => {
                    router.push({
                      pathname:
                        "/reservation/customer",
                      params: {
                        date: selectedStartTime.toISOString(),
                        startTime:
                          formatTime(
                            selectedStartTime
                          ),
                        guestCount: String(
                          guestCount
                        ),
                      },
                    });
                  }}
                >
                  <Text
                    style={
                      styles.continueButtonText
                    }
                  >
                    Verder
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={
                  styles.unavailableCard
                }
              >
                <Text
                  style={
                    styles.unavailableIcon
                  }
                >
                  ×
                </Text>

                <Text
                  style={
                    styles.resultTitle
                  }
                >
                  Geen beschikbaarheid
                </Text>

                <Text
                  style={
                    styles.resultSubtitle
                  }
                >
                  {formatTime(
                    selectedStartTime
                  )}{" "}
                  ·{" "}
                  {guestCount}{" "}
                  {guestCount === 1
                    ? "persoon"
                    : "personen"}
                </Text>

                {availability
                  .alternativeSlots
                  ?.length > 0 && (
                  <>
                    <Text
                      style={
                        styles.alternativeTitle
                      }
                    >
                      Mogelijke tijden
                    </Text>

                    <View
                      style={
                        styles.alternativeList
                      }
                    >
                      {availability.alternativeSlots.map(
                        (slot) => (
                          <TouchableOpacity
                            key={
                              slot.startTime
                            }
                            style={
                              styles.alternativeButton
                            }
                            activeOpacity={
                              0.75
                            }
                            onPress={() => {
                              const date =
                                new Date(
                                  slot.startTime
                                );

                              setSelectedDate(
                                date
                              );

                              setSelectedHour(
                                date.getHours()
                              );

                              setSelectedMinute(
                                date.getMinutes()
                              );

                              setAvailability(
                                null
                              );
                            }}
                          >
                            <Text
                              style={
                                styles.alternativeButtonText
                              }
                            >
                              {formatAlternativeTime(
                                slot.startTime
                              )}
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 36,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
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
    marginTop: 5,
  },

  section: {
    marginBottom: 28,
  },

  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },

  navigationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  navigationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  navigationArrow: {
    fontSize: 28,
    color: "#111",
  },

  selectedValue: {
    flex: 1,
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  selectedValueText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
    textTransform: "capitalize",
  },

  timeValue: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111",
  },

  helperText: {
    fontSize: 12,
    color: "#888",
    marginTop: 7,
    textAlign: "center",
  },

  guestSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    minHeight: 80,
  },

  guestButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },

  guestButtonText: {
    fontSize: 28,
    color: "#111",
  },

  guestValue: {
    alignItems: "center",
    minWidth: 100,
  },

  guestNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
  },

  guestLabel: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },

  checkButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#087FE5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  checkButtonDisabled: {
    opacity: 0.6,
  },

  checkButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  errorCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginTop: 18,
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
    color: "#666",
    marginTop: 5,
  },

  resultContainer: {
    marginTop: 24,
  },

  availableCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dcefdc",
  },

  unavailableCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0dddd",
  },

  availableIcon: {
    fontSize: 32,
    color: "#2e7d32",
    marginBottom: 8,
  },

  unavailableIcon: {
    fontSize: 34,
    color: "#c62828",
    marginBottom: 8,
  },

  resultTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#111",
  },

  resultSubtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 6,
  },

  continueButton: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },

  continueButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  alternativeTitle: {
    alignSelf: "flex-start",
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginTop: 24,
    marginBottom: 10,
  },

  alternativeList: {
    width: "100%",
    gap: 8,
  },

  alternativeButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#f4f4f4",
    alignItems: "center",
    justifyContent: "center",
  },

  alternativeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
});