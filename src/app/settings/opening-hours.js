import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useState } from "react";

import { api } from "../../services/api";
import { useAuth } from "../../context/auth-context";

const DAYS = [
  { key: "MONDAY", label: "Maandag" },
  { key: "TUESDAY", label: "Dinsdag" },
  { key: "WEDNESDAY", label: "Woensdag" },
  { key: "THURSDAY", label: "Donderdag" },
  { key: "FRIDAY", label: "Vrijdag" },
  { key: "SATURDAY", label: "Zaterdag" },
  { key: "SUNDAY", label: "Zondag" },
];

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    mins
  ).padStart(2, "0")}`;
}

function timeToMinutes(time) {
  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function isValidTime(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return false;
  }

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return (
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

function createEmptySchedule() {
  return DAYS.reduce((schedule, day) => {
    schedule[day.key] = [];
    return schedule;
  }, {});
}

export default function OpeningHoursScreen() {
  const { accessToken } = useAuth();

  const [restaurant, setRestaurant] =
    useState(null);

  const [schedule, setSchedule] =
    useState(createEmptySchedule());

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  useEffect(() => {
    loadOpeningHours();
  }, []);

  async function loadOpeningHours() {
    try {
      const restaurantResponse =
        await api.getMyRestaurant(
          accessToken
        );

      const restaurantData =
        restaurantResponse.data;

      setRestaurant(restaurantData);

      const response =
        await api.getOpeningHours(
          restaurantData.id,
          accessToken
        );

      const openingHours =
        response.data ?? response;

      const newSchedule =
        createEmptySchedule();

      for (const openingHour of openingHours) {
        if (
          !newSchedule[
            openingHour.dayOfWeek
          ]
        ) {
          continue;
        }

        newSchedule[
          openingHour.dayOfWeek
        ].push({
          opensAt:
            minutesToTime(
              openingHour.opensAtMinutes
            ),

          closesAt:
            minutesToTime(
              openingHour.closesAtMinutes
            ),
        });
      }

      setSchedule(newSchedule);
    } catch (error) {
      console.error(
        "Failed to load opening hours:",
        error
      );

      Alert.alert(
        "Fout",
        error.message ||
          "De openingstijden konden niet worden geladen."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function updateDay(dayKey, periods) {
    setSchedule((current) => ({
      ...current,
      [dayKey]: periods,
    }));
  }

  function toggleDay(dayKey, isOpen) {
    if (isOpen) {
      updateDay(dayKey, [
        {
          opensAt: "11:00",
          closesAt: "22:00",
        },
      ]);

      return;
    }

    updateDay(dayKey, []);
  }

  function updatePeriod(
    dayKey,
    index,
    field,
    value
  ) {
    const periods = [
      ...schedule[dayKey],
    ];

    periods[index] = {
      ...periods[index],
      [field]: value,
    };

    updateDay(dayKey, periods);
  }

  function addPeriod(dayKey) {
    const periods = [
      ...schedule[dayKey],
    ];

    periods.push({
      opensAt: "11:00",
      closesAt: "22:00",
    });

    updateDay(dayKey, periods);
  }

  function removePeriod(
    dayKey,
    index
  ) {
    const periods = schedule[
      dayKey
    ].filter(
      (_, periodIndex) =>
        periodIndex !== index
    );

    updateDay(dayKey, periods);
  }

  async function handleSave() {
    try {
      setIsSaving(true);

      const openingHours = [];

      for (const day of DAYS) {
        const periods =
          schedule[day.key];

        for (const period of periods) {
          const opensAt =
            period.opensAt.trim();

          const closesAt =
            period.closesAt.trim();

          if (
            !isValidTime(opensAt) ||
            !isValidTime(closesAt)
          ) {
            Alert.alert(
              "Ongeldige openingstijden",
              `${day.label}: gebruik het formaat HH:MM, bijvoorbeeld 17:00.`
            );

            return;
          }

          const opensAtMinutes =
            timeToMinutes(opensAt);

          const closesAtMinutes =
            timeToMinutes(closesAt);

          if (
            opensAtMinutes >=
            closesAtMinutes
          ) {
            Alert.alert(
              "Ongeldige openingstijden",
              `${day.label}: openingstijd moet vóór sluitingstijd liggen.`
            );

            return;
          }

          openingHours.push({
            dayOfWeek: day.key,

            opensAtMinutes,

            closesAtMinutes,
          });
        }
      }

      await api.updateOpeningHours(
        restaurant.id,
        openingHours,
        accessToken
      );

      Alert.alert(
        "Opgeslagen",
        "De openingstijden zijn bijgewerkt."
      );
    } catch (error) {
      console.error(
        "Failed to update opening hours:",
        error
      );

      Alert.alert(
        "Fout",
        error.message ||
          "De openingstijden konden niet worden opgeslagen."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        Openingstijden
      </Text>

      <Text style={styles.description}>
        Stel de wekelijkse openingstijden
        van je restaurant in.
      </Text>

      <View style={styles.daysContainer}>
        {DAYS.map((day) => {
          const periods =
            schedule[day.key];

          const isOpen =
            periods.length > 0;

          return (
            <View
              key={day.key}
              style={styles.dayCard}
            >
              <View
                style={
                  styles.dayHeader
                }
              >
                <Text
                  style={
                    styles.dayTitle
                  }
                >
                  {day.label}
                </Text>

                <View
                  style={
                    styles.switchContainer
                  }
                >
                  <Text
                    style={
                      styles.openText
                    }
                  >
                    {isOpen
                      ? "Open"
                      : "Gesloten"}
                  </Text>

                  <Switch
                    value={isOpen}
                    onValueChange={(
                      value
                    ) =>
                      toggleDay(
                        day.key,
                        value
                      )
                    }
                  />
                </View>
              </View>

              {isOpen && (
                <View
                  style={
                    styles.periodsContainer
                  }
                >
                  {periods.map(
                    (
                      period,
                      index
                    ) => (
                      <View
                        key={index}
                        style={
                          styles.periodRow
                        }
                      >
                        <View
                          style={
                            styles.timeField
                          }
                        >
                          <Text
                            style={
                              styles.timeLabel
                            }
                          >
                            Van
                          </Text>

                          <TextInput
                            style={
                              styles.input
                            }
                            value={
                              period.opensAt
                            }
                            onChangeText={(
                              value
                            ) => {
                              updatePeriod(
                                day.key,
                                index,
                                "opensAt",
                                value
                              );
                            }}
                            placeholder="17:00"
                            keyboardType="numbers-and-punctuation"
                            maxLength={5}
                            selectTextOnFocus={false}
                          />
                        </View>

                        <Text
                          style={
                            styles.separator
                          }
                        >
                          –
                        </Text>

                        <View
                          style={
                            styles.timeField
                          }
                        >
                          <Text
                            style={
                              styles.timeLabel
                            }
                          >
                            Tot
                          </Text>

                          <TextInput
                            style={
                              styles.input
                            }
                            value={
                              period.closesAt
                            }
                            onChangeText={(
                              value
                            ) => {
                              updatePeriod(
                                day.key,
                                index,
                                "closesAt",
                                value
                              );
                            }}
                            placeholder="22:00"
                            keyboardType="numbers-and-punctuation"
                            maxLength={5}
                            selectTextOnFocus={false}
                          />
                        </View>

                        <Pressable
                          style={
                            styles.removeButton
                          }
                          onPress={() =>
                            removePeriod(
                              day.key,
                              index
                            )
                          }
                        >
                          <Text
                            style={
                              styles.removeButtonText
                            }
                          >
                            ×
                          </Text>
                        </Pressable>
                      </View>
                    )
                  )}

                  <Pressable
                    style={
                      styles.addButton
                    }
                    onPress={() =>
                      addPeriod(
                        day.key
                      )
                    }
                  >
                    <Text
                      style={
                        styles.addButtonText
                      }
                    >
                      + Periode toevoegen
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Pressable
        style={[
          styles.saveButton,
          isSaving &&
            styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            style={
              styles.saveButtonText
            }
          >
            Opslaan
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  contentContainer: {
    padding: 24,
    paddingBottom: 48,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },

  description: {
    fontSize: 15,
    color: "#666",
    marginBottom: 24,
  },

  daysContainer: {
    gap: 12,
  },

  dayCard: {
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fafafa",
  },

  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dayTitle: {
    fontSize: 17,
    fontWeight: "600",
  },

  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  openText: {
    fontSize: 14,
    color: "#666",
  },

  periodsContainer: {
    marginTop: 16,
    gap: 12,
  },

  periodRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },

  timeField: {
    flex: 1,
    gap: 6,
  },

  timeLabel: {
    fontSize: 13,
    color: "#666",
  },

  input: {
    height: 46,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 9,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },

  separator: {
    fontSize: 20,
    paddingBottom: 11,
    color: "#777",
  },

  removeButton: {
    width: 42,
    height: 46,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee",
  },

  removeButtonText: {
    fontSize: 24,
    color: "#666",
  },

  addButton: {
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  saveButton: {
    height: 52,
    borderRadius: 10,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});