import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../../services/api";
import { useAuth } from "../../context/auth-context";
import MassageChoice from "../../components/MassageChoice";
import {
  DAYS,
  createEmptyWeek,
  summarizeWorkingDays,
  weekToWorkingHours,
  workingHoursToWeek,
} from "../../utils/time";

// ======================================================
// Therapists
// ======================================================
//
// The owner manages the therapists: name, the massages
// each therapist can perform and their own weekly working
// hours. Customers never choose a therapist; the system
// picks a free one who can perform the booked massage.
//
// Therapists are deactivated instead of deleted, so that
// existing appointments keep their therapist.
// ======================================================

const EMPTY_FORM = {
  name: "",
  serviceIds: [],
  week: createEmptyWeek(),
};

export default function TherapistsScreen() {
  const { accessToken, business } = useAuth();

  const businessId = business?.id;

  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // null = form closed, "new" = adding, otherwise the id
  // of the therapist being edited.
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const [therapistResponse, serviceResponse] =
        await Promise.all([
          api.getTherapists(businessId, accessToken, {
            includeInactive: true,
          }),
          api.getMassageServices(
            businessId,
            accessToken
          ),
        ]);

      setTherapists(therapistResponse.data);
      setServices(serviceResponse.data);
    } catch (error) {
      Alert.alert(
        "Fout",
        error.message ||
          "De therapeuten konden niet worden geladen."
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId, accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  function startAdding() {
    setForm({
      name: "",
      serviceIds: [],
      week: createEmptyWeek(),
    });
    setEditingId("new");
  }

  function startEditing(therapist) {
    setForm({
      name: therapist.name,
      serviceIds: therapist.serviceIds,
      week: workingHoursToWeek(therapist.workingHours),
    });
    setEditingId(therapist.id);
  }

  function closeForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function setDayPeriods(dayKey, periods) {
    setForm((current) => ({
      ...current,
      week: { ...current.week, [dayKey]: periods },
    }));
  }

  function toggleDay(dayKey, isWorking) {
    setDayPeriods(
      dayKey,
      isWorking ? [{ start: "09:00", end: "17:00" }] : []
    );
  }

  function updatePeriod(dayKey, index, field, value) {
    setDayPeriods(
      dayKey,
      form.week[dayKey].map((period, i) =>
        i === index
          ? { ...period, [field]: value }
          : period
      )
    );
  }

  function addPeriod(dayKey) {
    setDayPeriods(dayKey, [
      ...form.week[dayKey],
      { start: "13:00", end: "17:00" },
    ]);
  }

  function removePeriod(dayKey, index) {
    setDayPeriods(
      dayKey,
      form.week[dayKey].filter((_, i) => i !== index)
    );
  }

  async function handleSave() {
    const name = form.name.trim();

    if (!name) {
      Alert.alert("Controleer je invoer", "Vul een naam in.");
      return;
    }

    const { workingHours, error } = weekToWorkingHours(
      form.week
    );

    if (error) {
      Alert.alert("Controleer je invoer", error);
      return;
    }

    const data = {
      name,
      serviceIds: form.serviceIds,
      workingHours,
    };

    try {
      setIsSaving(true);

      if (editingId === "new") {
        await api.createTherapist(
          businessId,
          data,
          accessToken
        );
      } else {
        await api.updateTherapist(
          businessId,
          editingId,
          data,
          accessToken
        );
      }

      closeForm();
      await load();
    } catch (error) {
      Alert.alert(
        "Opslaan mislukt",
        error.message ||
          "De therapeut kon niet worden opgeslagen."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function setActive(therapist, isActive) {
    try {
      if (isActive) {
        await api.updateTherapist(
          businessId,
          therapist.id,
          { isActive: true },
          accessToken
        );
      } else {
        await api.deactivateTherapist(
          businessId,
          therapist.id,
          accessToken
        );
      }

      await load();
    } catch (error) {
      Alert.alert(
        "Fout",
        error.message ||
          "De wijziging kon niet worden opgeslagen."
      );
    }
  }

  function confirmDeactivate(therapist) {
    Alert.alert(
      "Therapeut uitschakelen?",
      `${therapist.name} krijgt geen nieuwe afspraken meer. Bestaande afspraken blijven bewaard.`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Uitschakelen",
          style: "destructive",
          onPress: () => setActive(therapist, false),
        },
      ]
    );
  }

  function serviceNames(ids) {
    const names = services
      .filter((service) => ids.includes(service.id))
      .map((service) => service.name);

    return names.length > 0
      ? names.join(", ")
      : "Geen massages gekozen";
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios" ? "padding" : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Therapeuten</Text>

        <Text style={styles.description}>
          Kies per therapeut welke massages die kan geven
          en wanneer die werkt. Klanten kiezen zelf geen
          therapeut.
        </Text>

        {editingId !== null ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingId === "new"
                ? "Nieuwe therapeut"
                : "Therapeut aanpassen"}
            </Text>

            <Text style={styles.label}>Naam</Text>

            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(name) =>
                setForm({ ...form, name })
              }
              placeholder="Bijvoorbeeld Anna"
              placeholderTextColor="#999"
            />

            <Text style={styles.sectionLabel}>
              Massages die deze therapeut geeft
            </Text>

            <MassageChoice
              services={services}
              selectedIds={form.serviceIds}
              onChange={(serviceIds) =>
                setForm({ ...form, serviceIds })
              }
            />

            <Text style={styles.sectionLabel}>
              Werkuren per week
            </Text>

            {DAYS.map((day) => {
              const periods = form.week[day.key];
              const isWorking = periods.length > 0;

              return (
                <View key={day.key} style={styles.day}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayTitle}>
                      {day.label}
                    </Text>

                    <View style={styles.dayToggle}>
                      <Text style={styles.dayState}>
                        {isWorking ? "Werkt" : "Vrij"}
                      </Text>

                      <Switch
                        value={isWorking}
                        onValueChange={(value) =>
                          toggleDay(day.key, value)
                        }
                      />
                    </View>
                  </View>

                  {periods.map((period, index) => (
                    <View
                      key={index}
                      style={styles.periodRow}
                    >
                      <TextInput
                        style={[
                          styles.input,
                          styles.timeInput,
                        ]}
                        value={period.start}
                        onChangeText={(value) =>
                          updatePeriod(
                            day.key,
                            index,
                            "start",
                            value
                          )
                        }
                        placeholder="09:00"
                        placeholderTextColor="#999"
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />

                      <Text style={styles.until}>tot</Text>

                      <TextInput
                        style={[
                          styles.input,
                          styles.timeInput,
                        ]}
                        value={period.end}
                        onChangeText={(value) =>
                          updatePeriod(
                            day.key,
                            index,
                            "end",
                            value
                          )
                        }
                        placeholder="17:00"
                        placeholderTextColor="#999"
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />

                      <Pressable
                        onPress={() =>
                          removePeriod(day.key, index)
                        }
                      >
                        <Text style={styles.dangerLink}>
                          Verwijder
                        </Text>
                      </Pressable>
                    </View>
                  ))}

                  {isWorking && (
                    <Pressable
                      onPress={() => addPeriod(day.key)}
                    >
                      <Text style={styles.link}>
                        + Periode toevoegen
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            <View style={styles.row}>
              <Pressable
                style={[
                  styles.button,
                  styles.secondaryButton,
                ]}
                onPress={closeForm}
                disabled={isSaving}
              >
                <Text style={styles.secondaryText}>
                  Annuleren
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.button,
                  styles.primaryButton,
                  isSaving && styles.disabled,
                ]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>
                    Opslaan
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={[
              styles.button,
              styles.primaryButton,
              styles.addButton,
            ]}
            onPress={startAdding}
          >
            <Text style={styles.primaryText}>
              Therapeut toevoegen
            </Text>
          </Pressable>
        )}

        {therapists.length === 0 && (
          <Text style={styles.empty}>
            Je hebt nog geen therapeuten toegevoegd.
          </Text>
        )}

        {therapists.map((therapist) => (
          <View
            key={therapist.id}
            style={[
              styles.card,
              !therapist.isActive && styles.inactiveCard,
            ]}
          >
            <Text style={styles.cardName}>
              {therapist.name}
              {therapist.isActive
                ? ""
                : " · uitgeschakeld"}
            </Text>

            <Text style={styles.cardMeta}>
              {serviceNames(therapist.serviceIds)}
            </Text>

            <Text style={styles.cardMeta}>
              {summarizeWorkingDays(
                therapist.workingHours
              ) ?? "Geen werkuren ingesteld"}
            </Text>

            <View style={styles.cardActions}>
              <Pressable
                onPress={() => startEditing(therapist)}
              >
                <Text style={styles.link}>Aanpassen</Text>
              </Pressable>

              {therapist.isActive ? (
                <Pressable
                  onPress={() =>
                    confirmDeactivate(therapist)
                  }
                >
                  <Text style={styles.dangerLink}>
                    Uitschakelen
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() =>
                    setActive(therapist, true)
                  }
                >
                  <Text style={styles.link}>
                    Weer inschakelen
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: 24,
    paddingBottom: 48,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
  },

  description: {
    fontSize: 15,
    color: "#666",
    marginTop: 6,
    marginBottom: 20,
  },

  addButton: {
    marginBottom: 20,
  },

  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },

  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#111",
  },

  day: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dayTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  dayToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dayState: {
    fontSize: 14,
    color: "#666",
  },

  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },

  timeInput: {
    width: 84,
    textAlign: "center",
  },

  until: {
    fontSize: 14,
    color: "#666",
  },

  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },

  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },

  primaryButton: {
    backgroundColor: "#111",
  },

  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  secondaryButton: {
    backgroundColor: "#eee",
  },

  secondaryText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "600",
  },

  disabled: {
    opacity: 0.6,
  },

  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 24,
    fontSize: 15,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  inactiveCard: {
    opacity: 0.55,
  },

  cardName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },

  cardMeta: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  cardActions: {
    flexDirection: "row",
    gap: 24,
    marginTop: 14,
  },

  link: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0a58ca",
    marginTop: 8,
  },

  dangerLink: {
    fontSize: 15,
    fontWeight: "600",
    color: "#b3261e",
  },
});
