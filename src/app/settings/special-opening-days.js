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

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    mins
  ).padStart(2, "0")}`;
}

function timeToMinutes(time) {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Ongeldige datum";
  }

  return date.toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getTodayString() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createDefaultPeriod() {
  return {
    opensAtMinutes: 660,
    closesAtMinutes: 1320,
  };
}

export default function SpecialOpeningDaysScreen() {
  const { accessToken } = useAuth();

  const [restaurantId, setRestaurantId] =
    useState(null);

  const [specialOpeningDays, setSpecialOpeningDays] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [date, setDate] =
    useState(getTodayString());

  const [isClosed, setIsClosed] =
    useState(false);

  const [openingPeriods, setOpeningPeriods] =
    useState([
      createDefaultPeriod(),
    ]);

  // UI values for editable time inputs.
  //
  // These are kept as strings so the user can
  // freely type values such as:
  //
  // 17:00
  // 18:30
  // 22:00
  //
  // without React Native immediately changing
  // the value while typing.
  const [timeInputs, setTimeInputs] =
    useState({});

  useEffect(() => {
    loadSpecialOpeningDays();
  }, []);

  async function loadSpecialOpeningDays() {
    try {
      const restaurantResponse =
        await api.getMyRestaurant(
          accessToken
        );

      const restaurant =
        restaurantResponse.data;

      if (!restaurant?.id) {
        throw new Error(
          "Restaurant ID kon niet worden gevonden."
        );
      }

      setRestaurantId(
        restaurant.id
      );

      const response =
        await api.getSpecialOpeningDays(
          restaurant.id,
          accessToken
        );

      const data =
        response?.data ?? response ?? [];

      setSpecialOpeningDays(data);
    } catch (error) {
      console.error(
        "Failed to load special opening days:",
        error
      );

      Alert.alert(
        "Fout",
        error.message ||
          "De speciale openingsdagen konden niet worden geladen."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setDate(getTodayString());
    setIsClosed(false);

    const defaultPeriod =
      createDefaultPeriod();

    setOpeningPeriods([
      defaultPeriod,
    ]);

    setTimeInputs({
      "0-open": minutesToTime(
        defaultPeriod.opensAtMinutes
      ),
      "0-close": minutesToTime(
        defaultPeriod.closesAtMinutes
      ),
    });
  }

  function startEditing(
    specialOpeningDay
  ) {
    setEditingId(
      specialOpeningDay.id
    );

    const rawDate =
      specialOpeningDay.date;

    const parsedDate =
      new Date(rawDate);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      Alert.alert(
        "Fout",
        "De datum van deze speciale openingsdag kon niet worden gelezen."
      );

      return;
    }

    const year =
      parsedDate.getFullYear();

    const month = String(
      parsedDate.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      parsedDate.getDate()
    ).padStart(2, "0");

    setDate(
      `${year}-${month}-${day}`
    );

    setIsClosed(
      specialOpeningDay.isClosed
    );

    const periods =
      specialOpeningDay.openingPeriods
        ?.length
        ? specialOpeningDay.openingPeriods.map(
            (period) => ({
              opensAtMinutes:
                period.opensAtMinutes,
              closesAtMinutes:
                period.closesAtMinutes,
            })
          )
        : [createDefaultPeriod()];

    setOpeningPeriods(periods);

    const inputs = {};

    periods.forEach(
      (period, index) => {
        inputs[
          `${index}-open`
        ] = minutesToTime(
          period.opensAtMinutes
        );

        inputs[
          `${index}-close`
        ] = minutesToTime(
          period.closesAtMinutes
        );
      }
    );

    setTimeInputs(inputs);
  }

  function updatePeriod(
    index,
    field,
    value
  ) {
    const periods = [
      ...openingPeriods,
    ];

    periods[index] = {
      ...periods[index],
      [field]: value,
    };

    setOpeningPeriods(
      periods
    );
  }

  function updateTimeInput(
    index,
    field,
    value
  ) {
    // Only allow numbers and colon.
    const cleanedValue =
      value.replace(
        /[^0-9:]/g,
        ""
      );

    setTimeInputs(
      (current) => ({
        ...current,
        [`${index}-${field}`]:
          cleanedValue,
      })
    );
  }

  function addPeriod() {
    const newIndex =
      openingPeriods.length;

    const newPeriod =
      createDefaultPeriod();

    setOpeningPeriods(
      (current) => [
        ...current,
        newPeriod,
      ]
    );

    setTimeInputs(
      (current) => ({
        ...current,
        [`${newIndex}-open`]:
          minutesToTime(
            newPeriod.opensAtMinutes
          ),
        [`${newIndex}-close`]:
          minutesToTime(
            newPeriod.closesAtMinutes
          ),
      })
    );
  }

  function removePeriod(index) {
    if (
      openingPeriods.length === 1
    ) {
      Alert.alert(
        "Kan niet verwijderen",
        "Een open dag moet minstens één openingsperiode hebben."
      );

      return;
    }

    setOpeningPeriods(
      (current) =>
        current.filter(
          (_, periodIndex) =>
            periodIndex !== index
        )
    );

    setTimeInputs(
      (current) => {
        const updated = {};

        Object.entries(
          current
        ).forEach(
          ([key, value]) => {
            const [
              periodIndex,
              field,
            ] = key.split("-");

            const numericIndex =
              Number(periodIndex);

            if (
              numericIndex === index
            ) {
              return;
            }

            const newIndex =
              numericIndex > index
                ? numericIndex - 1
                : numericIndex;

            updated[
              `${newIndex}-${field}`
            ] = value;
          }
        );

        return updated;
      }
    );
  }

  function preparePeriodsForSave() {
    const convertedPeriods = [];

    for (
      let i = 0;
      i < openingPeriods.length;
      i++
    ) {
      const openValue =
        timeInputs[
          `${i}-open`
        ];

      const closeValue =
        timeInputs[
          `${i}-close`
        ];

      const opensAtMinutes =
        timeToMinutes(
          openValue || ""
        );

      const closesAtMinutes =
        timeToMinutes(
          closeValue || ""
        );

      if (
        opensAtMinutes === null ||
        closesAtMinutes === null
      ) {
        Alert.alert(
          "Ongeldige openingstijd",
          `Periode ${i + 1}: gebruik het formaat HH:MM, bijvoorbeeld 17:00.`
        );

        return null;
      }

      if (
        opensAtMinutes >=
        closesAtMinutes
      ) {
        Alert.alert(
          "Ongeldige openingstijden",
          `Periode ${i + 1}: openingstijd moet vóór sluitingstijd liggen.`
        );

        return null;
      }

      convertedPeriods.push({
        opensAtMinutes,
        closesAtMinutes,
      });
    }

    return convertedPeriods;
  }

  async function handleSave() {
    if (!restaurantId) {
      Alert.alert(
        "Fout",
        "Restaurant kon niet worden gevonden."
      );

      return;
    }

    if (
      !date.match(
        /^\d{4}-\d{2}-\d{2}$/
      )
    ) {
      Alert.alert(
        "Ongeldige datum",
        "Gebruik het formaat JJJJ-MM-DD."
      );

      return;
    }

    let periodsToSave = [];

    if (!isClosed) {
      periodsToSave =
        preparePeriodsForSave();

      if (!periodsToSave) {
        return;
      }
    }

    try {
      setIsSaving(true);

      const payload = {
        date,
        isClosed,
        openingPeriods:
          isClosed
            ? []
            : periodsToSave,
      };

      if (editingId) {
        await api.updateSpecialOpeningDay(
          restaurantId,
          editingId,
          payload,
          accessToken
        );
      } else {
        await api.createSpecialOpeningDay(
          restaurantId,
          payload,
          accessToken
        );
      }

      Alert.alert(
        "Opgeslagen",
        editingId
          ? "De speciale openingsdag is bijgewerkt."
          : "De speciale openingsdag is toegevoegd."
      );

      resetForm();

      await loadSpecialOpeningDays();
    } catch (error) {
      console.error(
        "Failed to save special opening day:",
        error
      );

      Alert.alert(
        "Fout",
        error.message ||
          "De speciale openingsdag kon niet worden opgeslagen."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!restaurantId) {
      Alert.alert(
        "Fout",
        "Restaurant kon niet worden gevonden."
      );

      return;
    }

    Alert.alert(
      "Verwijderen",
      "Weet je zeker dat je deze speciale openingsdag wilt verwijderen?",
      [
        {
          text: "Annuleren",
          style: "cancel",
        },

        {
          text: "Verwijderen",
          style: "destructive",

          onPress: async () => {
            try {
              await api.deleteSpecialOpeningDay(
                restaurantId,
                id,
                accessToken
              );

              if (
                editingId === id
              ) {
                resetForm();
              }

              await loadSpecialOpeningDays();
            } catch (error) {
              console.error(
                "Failed to delete special opening day:",
                error
              );

              Alert.alert(
                "Fout",
                error.message ||
                  "De speciale openingsdag kon niet worden verwijderd."
              );
            }
          },
        },
      ]
    );
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
        Speciale openingsdagen
      </Text>

      <Text
        style={styles.description}
      >
        Stel uitzonderlijke openingsuren in
        voor feestdagen en andere speciale
        dagen.
      </Text>

      <View style={styles.formCard}>
        <Text
          style={styles.sectionTitle}
        >
          {editingId
            ? "Speciale dag aanpassen"
            : "Speciale dag toevoegen"}
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>
            Datum
          </Text>

          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2026-12-25"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            maxLength={10}
          />
        </View>

        <View style={styles.closedRow}>
          <View>
            <Text style={styles.label}>
              Gesloten
            </Text>

            <Text
              style={styles.helperText}
            >
              Staat het restaurant deze dag
              volledig dicht?
            </Text>
          </View>

          <Switch
            value={isClosed}
            onValueChange={
              setIsClosed
            }
          />
        </View>

        {!isClosed && (
          <View
            style={
              styles.periodsContainer
            }
          >
            <Text style={styles.label}>
              Openingsuren
            </Text>

            {openingPeriods.map(
              (period, index) => (
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
                        timeInputs[
                          `${index}-open`
                        ] ??
                        minutesToTime(
                          period.opensAtMinutes
                        )
                      }
                      onChangeText={(
                        value
                      ) =>
                        updateTimeInput(
                          index,
                          "open",
                          value
                        )
                      }
                      placeholder="17:00"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
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
                        timeInputs[
                          `${index}-close`
                        ] ??
                        minutesToTime(
                          period.closesAtMinutes
                        )
                      }
                      onChangeText={(
                        value
                      ) =>
                        updateTimeInput(
                          index,
                          "close",
                          value
                        )
                      }
                      placeholder="22:00"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>

                  <Pressable
                    style={
                      styles.removeButton
                    }
                    onPress={() =>
                      removePeriod(
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
              onPress={addPeriod}
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
              {editingId
                ? "Wijzigingen opslaan"
                : "Toevoegen"}
            </Text>
          )}
        </Pressable>

        {editingId && (
          <Pressable
            style={
              styles.cancelButton
            }
            onPress={resetForm}
            disabled={isSaving}
          >
            <Text
              style={
                styles.cancelButtonText
              }
            >
              Annuleren
            </Text>
          </Pressable>
        )}
      </View>

      <View
        style={styles.listContainer}
      >
        <Text
          style={styles.sectionTitle}
        >
          Ingestelde speciale dagen
        </Text>

        {specialOpeningDays.length ===
        0 ? (
          <Text
            style={styles.emptyText}
          >
            Er zijn nog geen speciale
            openingsdagen ingesteld.
          </Text>
        ) : (
          specialOpeningDays.map(
            (specialOpeningDay) => (
              <View
                key={
                  specialOpeningDay.id
                }
                style={styles.dayCard}
              >
                <View
                  style={
                    styles.dayCardContent
                  }
                >
                  <Text
                    style={
                      styles.dayDate
                    }
                  >
                    {formatDate(
                      specialOpeningDay.date
                    )}
                  </Text>

                  {specialOpeningDay.isClosed ? (
                    <Text
                      style={
                        styles.closedText
                      }
                    >
                      Gesloten
                    </Text>
                  ) : (
                    <View>
                      {specialOpeningDay.openingPeriods?.map(
                        (
                          period,
                          index
                        ) => (
                          <Text
                            key={index}
                            style={
                              styles.periodText
                            }
                          >
                            {minutesToTime(
                              period.opensAtMinutes
                            )}{" "}
                            –{" "}
                            {minutesToTime(
                              period.closesAtMinutes
                            )}
                          </Text>
                        )
                      )}
                    </View>
                  )}
                </View>

                <View
                  style={
                    styles.actionsContainer
                  }
                >
                  <Pressable
                    style={
                      styles.editButton
                    }
                    onPress={() =>
                      startEditing(
                        specialOpeningDay
                      )
                    }
                  >
                    <Text
                      style={
                        styles.editButtonText
                      }
                    >
                      Bewerken
                    </Text>
                  </Pressable>

                  <Pressable
                    style={
                      styles.deleteButton
                    }
                    onPress={() =>
                      handleDelete(
                        specialOpeningDay.id
                      )
                    }
                  >
                    <Text
                      style={
                        styles.deleteButtonText
                      }
                    >
                      Verwijderen
                    </Text>
                  </Pressable>
                </View>
              </View>
            )
          )
        )}
      </View>
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

  formCard: {
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 12,
    padding: 18,
    backgroundColor: "#fafafa",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 18,
  },

  field: {
    gap: 7,
    marginBottom: 18,
  },

  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },

  helperText: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: "#fff",
  },

  closedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  periodsContainer: {
    gap: 12,
    marginBottom: 4,
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

  separator: {
    fontSize: 20,
    paddingBottom: 11,
    color: "#777",
  },

  removeButton: {
    width: 42,
    height: 48,
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
    marginTop: 24,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  cancelButton: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },

  listContainer: {
    marginTop: 32,
  },

  emptyText: {
    fontSize: 14,
    color: "#777",
  },

  dayCard: {
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },

  dayCardContent: {
    marginBottom: 14,
  },

  dayDate: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },

  periodText: {
    fontSize: 15,
    color: "#555",
    marginTop: 2,
  },

  closedText: {
    fontSize: 15,
    color: "#777",
  },

  actionsContainer: {
    flexDirection: "row",
    gap: 8,
  },

  editButton: {
    flex: 1,
    height: 44,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee",
  },

  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  deleteButton: {
    flex: 1,
    height: 44,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee",
  },

  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
});