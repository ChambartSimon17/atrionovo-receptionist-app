import { useEffect, useState } from "react";
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
import { useRouter } from "expo-router";

import { api } from "../../services/api";
import { useAuth } from "../../context/auth-context";
import {
  addDays,
  formatLongDate,
  todayString,
} from "../../utils/date";
import { formatDuration, formatPrice } from "../../utils/price";

// ======================================================
// New massage appointment
// ======================================================
//
// Steps: choose the massage, the day and a free time,
// then enter the customer. The backend chooses the
// therapist and the room; the customer cannot pick them.
// A note (for example a preferred therapist) is optional.
// ======================================================

export default function NewAppointmentScreen() {
  const router = useRouter();

  const { accessToken, business } = useAuth();

  const businessId = business?.id;

  const [services, setServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] =
    useState(true);

  const [serviceId, setServiceId] = useState(null);
  const [date, setDate] = useState(todayString());

  const [slots, setSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] =
    useState(false);
  const [slot, setSlot] = useState(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadServices() {
      try {
        const response = await api.getMassageServices(
          businessId,
          accessToken
        );

        setServices(response.data);
      } catch (error) {
        Alert.alert(
          "Fout",
          error.message ||
            "De massages konden niet worden geladen."
        );
      } finally {
        setIsLoadingServices(false);
      }
    }

    loadServices();
  }, [businessId, accessToken]);

  async function loadSlots() {
    if (!serviceId) {
      setSlots([]);
      return;
    }

    try {
      setIsLoadingSlots(true);

      const response =
        await api.getMassageAvailability(
          businessId,
          { date, serviceId },
          accessToken
        );

      setSlots(response.data.slots);
    } catch (error) {
      setSlots([]);

      Alert.alert(
        "Fout",
        error.message ||
          "De vrije momenten konden niet worden geladen."
      );
    } finally {
      setIsLoadingSlots(false);
    }
  }

  // New massage or day: the chosen time no longer applies.
  useEffect(() => {
    setSlot(null);
    loadSlots();
  }, [serviceId, date]);

  async function handleSave() {
    if (!serviceId || !slot) {
      Alert.alert(
        "Controleer je invoer",
        "Kies een massage en een tijdstip."
      );
      return;
    }

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !phoneNumber.trim()
    ) {
      Alert.alert(
        "Controleer je invoer",
        "Vul voornaam, achternaam en telefoonnummer in."
      );
      return;
    }

    const data = {
      massageServiceId: serviceId,
      startTime: slot.startTime,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim(),
    };

    if (email.trim()) {
      data.email = email.trim();
    }

    if (notes.trim()) {
      data.notes = notes.trim();
    }

    try {
      setIsSaving(true);

      await api.createMassageAppointment(
        businessId,
        data,
        accessToken
      );

      Alert.alert(
        "Afspraak gemaakt",
        "De afspraak staat in de agenda.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      if (error.status === 409) {
        Alert.alert(
          "Tijdstip niet meer vrij",
          "Dit tijdstip is net bezet geraakt. Kies een ander tijdstip."
        );

        setSlot(null);
        loadSlots();
      } else {
        Alert.alert(
          "Opslaan mislukt",
          error.message ||
            "De afspraak kon niet worden opgeslagen."
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoadingServices) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const today = todayString();

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
        <Text style={styles.title}>Nieuwe afspraak</Text>

        <Text style={styles.sectionLabel}>1. Massage</Text>

        {services.length === 0 && (
          <Text style={styles.empty}>
            Je hebt nog geen massages. Voeg ze eerst toe bij
            "Massages en prijzen".
          </Text>
        )}

        {services.map((service) => {
          const selected = service.id === serviceId;

          return (
            <Pressable
              key={service.id}
              style={[
                styles.serviceCard,
                selected && styles.serviceCardSelected,
              ]}
              onPress={() => setServiceId(service.id)}
            >
              <Text
                style={[
                  styles.serviceName,
                  selected && styles.selectedText,
                ]}
              >
                {service.name}
              </Text>

              <Text
                style={[
                  styles.serviceMeta,
                  selected && styles.selectedText,
                ]}
              >
                {formatDuration(service.durationMinutes)} ·{" "}
                {formatPrice(service.priceCents)}
              </Text>
            </Pressable>
          );
        })}

        <Text style={styles.sectionLabel}>2. Dag</Text>

        <View style={styles.dayRow}>
          <Pressable
            style={[
              styles.arrowButton,
              date <= today && styles.disabled,
            ]}
            onPress={() => setDate(addDays(date, -1))}
            disabled={date <= today}
          >
            <Text style={styles.arrow}>‹</Text>
          </Pressable>

          <Text style={styles.dayLabel}>
            {formatLongDate(date)}
          </Text>

          <Pressable
            style={styles.arrowButton}
            onPress={() => setDate(addDays(date, 1))}
          >
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>3. Tijdstip</Text>

        {!serviceId ? (
          <Text style={styles.empty}>
            Kies eerst een massage.
          </Text>
        ) : isLoadingSlots ? (
          <ActivityIndicator style={styles.slotLoading} />
        ) : slots.length === 0 ? (
          <Text style={styles.empty}>
            Geen vrije momenten op deze dag.
          </Text>
        ) : (
          <View style={styles.slotWrap}>
            {slots.map((candidate) => {
              const selected =
                slot?.startTime === candidate.startTime;

              return (
                <Pressable
                  key={candidate.startTime}
                  style={[
                    styles.slot,
                    selected && styles.slotSelected,
                  ]}
                  onPress={() => setSlot(candidate)}
                >
                  <Text
                    style={[
                      styles.slotText,
                      selected && styles.selectedText,
                    ]}
                  >
                    {candidate.time}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionLabel}>4. Klant</Text>

        <View style={styles.card}>
          <Field
            label="Voornaam"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <Field
            label="Achternaam"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <Field
            label="Telefoonnummer"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <Field
            label="E-mailadres (optioneel)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Field
            label="Notitie (optioneel)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Bijvoorbeeld: liefst bij Anna"
            multiline
          />
        </View>

        <Pressable
          style={[
            styles.saveButton,
            (!serviceId || !slot || isSaving) &&
              styles.disabled,
          ]}
          onPress={handleSave}
          disabled={!serviceId || !slot || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>
              Afspraak bevestigen
            </Text>
          )}
        </Pressable>
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

  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginTop: 24,
    marginBottom: 10,
  },

  empty: {
    fontSize: 14,
    color: "#888",
  },

  serviceCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#fff",
  },

  serviceCardSelected: {
    backgroundColor: "#111",
    borderColor: "#111",
  },

  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  serviceMeta: {
    fontSize: 14,
    color: "#666",
    marginTop: 3,
  },

  selectedText: {
    color: "#fff",
  },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  arrow: {
    fontSize: 26,
    color: "#111",
    marginTop: -2,
  },

  dayLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },

  slotLoading: {
    marginVertical: 12,
  },

  slotWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  slot: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  slotSelected: {
    backgroundColor: "#111",
    borderColor: "#111",
  },

  slotText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
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

  saveButton: {
    backgroundColor: "#111",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },

  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  disabled: {
    opacity: 0.4,
  },
});
