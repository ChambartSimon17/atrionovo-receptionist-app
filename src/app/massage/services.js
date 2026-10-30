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
import {
  centsToInputText,
  formatDuration,
  formatPrice,
  parsePriceToCents,
} from "../../utils/price";

// ======================================================
// Massage services
// ======================================================
//
// The owner manages the massages customers can book:
// name, duration and price. These are also shown on the
// booking widget later.
//
// A service is deactivated instead of deleted, so that
// existing appointments keep their service.
// ======================================================

const EMPTY_FORM = {
  name: "",
  description: "",
  duration: "60",
  price: "",
};

export default function MassageServicesScreen() {
  const { accessToken, business } = useAuth();

  const businessId = business?.id;

  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // null = form closed, "new" = adding, otherwise the id
  // of the service being edited.
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadServices = useCallback(async () => {
    try {
      const response = await api.getMassageServices(
        businessId,
        accessToken,
        { includeInactive: true }
      );

      setServices(response.data);
    } catch (error) {
      Alert.alert(
        "Fout",
        error.message ||
          "De massages konden niet worden geladen."
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId, accessToken]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  function startAdding() {
    setForm(EMPTY_FORM);
    setEditingId("new");
  }

  function startEditing(service) {
    setForm({
      name: service.name,
      description: service.description ?? "",
      duration: String(service.durationMinutes),
      price: centsToInputText(service.priceCents),
    });

    setEditingId(service.id);
  }

  function closeForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    const name = form.name.trim();
    const durationMinutes = Number(form.duration);
    const priceCents = parsePriceToCents(form.price);

    if (!name) {
      Alert.alert("Controleer je invoer", "Vul een naam in.");
      return;
    }

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      durationMinutes > 480
    ) {
      Alert.alert(
        "Controleer je invoer",
        "De duur moet tussen 5 en 480 minuten liggen."
      );
      return;
    }

    if (priceCents === null) {
      Alert.alert(
        "Controleer je invoer",
        "Vul een geldige prijs in, bijvoorbeeld 55 of 55,50."
      );
      return;
    }

    const data = {
      name,
      description: form.description.trim() || null,
      durationMinutes,
      priceCents,
    };

    try {
      setIsSaving(true);

      if (editingId === "new") {
        await api.createMassageService(
          businessId,
          data,
          accessToken
        );
      } else {
        await api.updateMassageService(
          businessId,
          editingId,
          data,
          accessToken
        );
      }

      closeForm();
      await loadServices();
    } catch (error) {
      Alert.alert(
        "Opslaan mislukt",
        error.message ||
          "De massage kon niet worden opgeslagen."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function setActive(service, isActive) {
    try {
      if (isActive) {
        await api.updateMassageService(
          businessId,
          service.id,
          { isActive: true },
          accessToken
        );
      } else {
        await api.deactivateMassageService(
          businessId,
          service.id,
          accessToken
        );
      }

      await loadServices();
    } catch (error) {
      Alert.alert(
        "Fout",
        error.message ||
          "De wijziging kon niet worden opgeslagen."
      );
    }
  }

  function confirmDeactivate(service) {
    Alert.alert(
      "Massage uitschakelen?",
      `"${service.name}" kan dan niet meer geboekt worden. Bestaande afspraken blijven bewaard.`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Uitschakelen",
          style: "destructive",
          onPress: () => setActive(service, false),
        },
      ]
    );
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
          Massages en prijzen
        </Text>

        <Text style={styles.description}>
          Dit zijn de massages die klanten kunnen
          boeken.
        </Text>

        {editingId !== null ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingId === "new"
                ? "Nieuwe massage"
                : "Massage aanpassen"}
            </Text>

            <Field
              label="Naam"
              value={form.name}
              onChangeText={(name) =>
                setForm({ ...form, name })
              }
              placeholder="Bijvoorbeeld ontspanningsmassage"
            />

            <Field
              label="Beschrijving (optioneel)"
              value={form.description}
              onChangeText={(description) =>
                setForm({ ...form, description })
              }
              multiline
            />

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Field
                  label="Duur (minuten)"
                  value={form.duration}
                  onChangeText={(duration) =>
                    setForm({ ...form, duration })
                  }
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.rowItem}>
                <Field
                  label="Prijs (€)"
                  value={form.price}
                  onChangeText={(price) =>
                    setForm({ ...form, price })
                  }
                  keyboardType="decimal-pad"
                  placeholder="55,00"
                />
              </View>
            </View>

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
              Massage toevoegen
            </Text>
          </Pressable>
        )}

        {services.length === 0 && (
          <Text style={styles.empty}>
            Je hebt nog geen massages toegevoegd.
          </Text>
        )}

        {services.map((service) => (
          <View
            key={service.id}
            style={[
              styles.serviceCard,
              !service.isActive && styles.inactiveCard,
            ]}
          >
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceName}>
                {service.name}
              </Text>

              <Text style={styles.servicePrice}>
                {formatPrice(service.priceCents)}
              </Text>
            </View>

            <Text style={styles.serviceMeta}>
              {formatDuration(service.durationMinutes)}
              {service.isActive
                ? ""
                : " · uitgeschakeld"}
            </Text>

            {!!service.description && (
              <Text style={styles.serviceDescription}>
                {service.description}
              </Text>
            )}

            <View style={styles.serviceActions}>
              <Pressable
                onPress={() => startEditing(service)}
              >
                <Text style={styles.link}>
                  Aanpassen
                </Text>
              </Pressable>

              {service.isActive ? (
                <Pressable
                  onPress={() =>
                    confirmDeactivate(service)
                  }
                >
                  <Text style={styles.dangerLink}>
                    Uitschakelen
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() =>
                    setActive(service, true)
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

function Field({ label, ...inputProps }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={[
          styles.input,
          inputProps.multiline && styles.multiline,
        ]}
        placeholderTextColor="#999"
        {...inputProps}
      />
    </View>
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

  field: {
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
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

  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  rowItem: {
    flex: 1,
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

  serviceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  inactiveCard: {
    opacity: 0.55,
  },

  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  serviceName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },

  servicePrice: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },

  serviceMeta: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  serviceDescription: {
    fontSize: 14,
    color: "#444",
    marginTop: 8,
    lineHeight: 20,
  },

  serviceActions: {
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
