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
import { colors, spacing } from "../../theme";
import { settingsStyles, switchColors } from "../../theme/settingsStyles";
import { useEmbedded } from "../../components/embedded";
import MassageChoice from "../../components/MassageChoice";
import WeekHoursEditor from "../../components/WeekHoursEditor";
import {
  createEmptyWeek,
  summarizeWorkingDays,
  weekToWorkingHours,
  workingHoursToWeek,
} from "../../utils/time";

// ======================================================
// Treatment rooms
// ======================================================
//
// The owner manages the treatment rooms and chooses which
// massages can take place in each room. Two massages can
// only run at the same time in different rooms.
//
// Rooms are deactivated instead of deleted, so that
// existing appointments keep their room.
//
// A room can be a separate location of the practice (for
// example a practice at home and one in a salon) with its
// own opening hours. It is then only bookable within those
// hours, the receptionist asks callers which location, and
// the agenda and calendar show where each massage is.
// ======================================================

const EMPTY_FORM = {
  name: "",
  serviceIds: [],
  hasOwnHours: false,
  week: createEmptyWeek(),
};

export default function TreatmentRoomsScreen() {
  // Next to Meer on a tablet: use the whole pane.
  const embedded = useEmbedded();
  const { accessToken, business } = useAuth();

  const businessId = business?.id;

  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // null = form closed, "new" = adding, otherwise the id
  // of the room being edited.
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const [roomResponse, serviceResponse] =
        await Promise.all([
          api.getTreatmentRooms(
            businessId,
            accessToken,
            { includeInactive: true }
          ),
          api.getMassageServices(
            businessId,
            accessToken
          ),
        ]);

      setRooms(roomResponse.data);
      setServices(serviceResponse.data);
    } catch (error) {
      Alert.alert(
        "Fout",
        error.message ||
          "De behandelkamers konden niet worden geladen."
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId, accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  function startAdding() {
    setForm(EMPTY_FORM);
    setEditingId("new");
  }

  function startEditing(room) {
    setForm({
      name: room.name,
      serviceIds: room.serviceIds,
      hasOwnHours: room.hasOwnHours ?? false,
      week: workingHoursToWeek(room.openingHours),
    });
    setEditingId(room.id);
  }

  function closeForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    const name = form.name.trim();

    if (!name) {
      Alert.alert("Controleer je invoer", "Vul een naam in.");
      return;
    }

    const { workingHours: openingHours, error } =
      weekToWorkingHours(form.week);

    if (form.hasOwnHours && error) {
      Alert.alert("Controleer je invoer", error);
      return;
    }

    if (form.hasOwnHours && openingHours.length === 0) {
      Alert.alert(
        "Controleer je invoer",
        "Kies op welke dagen deze locatie open is."
      );
      return;
    }

    const data = {
      name,
      serviceIds: form.serviceIds,
      hasOwnHours: form.hasOwnHours,
      openingHours: form.hasOwnHours ? openingHours : [],
    };

    try {
      setIsSaving(true);

      if (editingId === "new") {
        await api.createTreatmentRoom(
          businessId,
          data,
          accessToken
        );
      } else {
        await api.updateTreatmentRoom(
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
          "De behandelkamer kon niet worden opgeslagen."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function setActive(room, isActive) {
    try {
      if (isActive) {
        await api.updateTreatmentRoom(
          businessId,
          room.id,
          { isActive: true },
          accessToken
        );
      } else {
        await api.deactivateTreatmentRoom(
          businessId,
          room.id,
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

  function confirmDeactivate(room) {
    Alert.alert(
      "Behandelkamer uitschakelen?",
      `${room.name} wordt niet meer gebruikt voor nieuwe afspraken. Bestaande afspraken blijven bewaard.`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Uitschakelen",
          style: "destructive",
          onPress: () => setActive(room, false),
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
        contentContainerStyle={[styles.content, embedded && styles.fill]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          Behandelkamers
        </Text>

        <Text style={styles.description}>
          Kies per kamer welke massages er kunnen
          plaatsvinden. Twee massages tegelijk kan alleen
          in verschillende kamers.
        </Text>

        {editingId !== null ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingId === "new"
                ? "Nieuwe behandelkamer"
                : "Behandelkamer aanpassen"}
            </Text>

            <Text style={styles.label}>Naam</Text>

            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(name) =>
                setForm({ ...form, name })
              }
              placeholder="Bijvoorbeeld Kamer 1"
              placeholderTextColor={colors.textDisabled}
            />

            <Text style={styles.sectionLabel}>
              Massages in deze kamer
            </Text>

            <MassageChoice
              services={services}
              selectedIds={form.serviceIds}
              onChange={(serviceIds) =>
                setForm({ ...form, serviceIds })
              }
            />

            <View style={styles.locationHeader}>
              <View style={styles.locationText}>
                <Text style={styles.sectionLabel}>
                  Aparte locatie
                </Text>
                <Text style={styles.cardMeta}>
                  Met eigen openingsuren, bijvoorbeeld je
                  praktijk thuis en een salon. De receptie
                  vraagt klanten op welke locatie ze willen
                  komen, en de agenda toont waar elke
                  afspraak is.
                </Text>
              </View>

              <Switch
                {...switchColors}
                value={form.hasOwnHours}
                onValueChange={(hasOwnHours) =>
                  setForm({ ...form, hasOwnHours })
                }
              />
            </View>

            {form.hasOwnHours ? (
              <WeekHoursEditor
                week={form.week}
                onChange={(week) => setForm({ ...form, week })}
              />
            ) : null}

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
              Behandelkamer toevoegen
            </Text>
          </Pressable>
        )}

        {rooms.length === 0 && (
          <Text style={styles.empty}>
            Je hebt nog geen behandelkamers toegevoegd.
          </Text>
        )}

        {rooms.map((room) => (
          <View
            key={room.id}
            style={[
              styles.card,
              !room.isActive && styles.inactiveCard,
            ]}
          >
            <Text style={styles.cardName}>
              {room.name}
              {room.isActive ? "" : " · uitgeschakeld"}
            </Text>

            <Text style={styles.cardMeta}>
              {serviceNames(room.serviceIds)}
            </Text>

            {room.hasOwnHours ? (
              <Text style={styles.cardMeta}>
                Aparte locatie · open{" "}
                {summarizeWorkingDays(room.openingHours) ??
                  "geen dagen"}
              </Text>
            ) : null}

            <View style={styles.cardActions}>
              <Pressable
                onPress={() => startEditing(room)}
              >
                <Text style={styles.link}>Aanpassen</Text>
              </Pressable>

              {room.isActive ? (
                <Pressable
                  onPress={() => confirmDeactivate(room)}
                >
                  <Text style={styles.dangerLink}>
                    Uitschakelen
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => setActive(room, true)}
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
  ...settingsStyles,

  fill: {
    maxWidth: "100%",
  },

  row: {
    ...settingsStyles.row,
    marginTop: spacing.xl,
  },

  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },

  locationText: {
    flex: 1,
  },
});
