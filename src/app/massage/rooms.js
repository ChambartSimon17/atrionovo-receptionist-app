import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../../services/api";
import { useAuth } from "../../context/auth-context";
import MassageChoice from "../../components/MassageChoice";

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
// ======================================================

const EMPTY_FORM = {
  name: "",
  serviceIds: [],
};

export default function TreatmentRoomsScreen() {
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

    const data = {
      name,
      serviceIds: form.serviceIds,
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
        contentContainerStyle={styles.content}
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
              placeholderTextColor="#999"
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
  },

  dangerLink: {
    fontSize: 15,
    fontWeight: "600",
    color: "#b3261e",
  },
});
