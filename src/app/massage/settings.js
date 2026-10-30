import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

// ======================================================
// Massage settings
// ======================================================
//
// Opening hours and special opening days are shared with
// restaurants. Restaurant-only settings (capacity, tables)
// are not shown here.
//
// The buffer is the time after every appointment during
// which the therapist and the room cannot be booked again
// (cleaning, rest).
// ======================================================

export default function MassageSettingsScreen() {
  const router = useRouter();

  const { accessToken } = useAuth();

  const [buffer, setBuffer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadBusiness() {
      try {
        const response =
          await api.getMyBusiness(accessToken);

        setBuffer(
          String(
            response.data.appointmentBufferMinutes ?? 0
          )
        );
      } catch (error) {
        Alert.alert(
          "Fout",
          error.message ||
            "De instellingen konden niet worden geladen."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadBusiness();
  }, [accessToken]);

  async function handleSaveBuffer() {
    const minutes = Number(buffer);

    if (
      buffer.trim() === "" ||
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      minutes > 120
    ) {
      Alert.alert(
        "Controleer je invoer",
        "De pauze moet een geheel aantal minuten tussen 0 en 120 zijn."
      );
      return;
    }

    try {
      setIsSaving(true);

      await api.updateMyBusiness(
        { appointmentBufferMinutes: minutes },
        accessToken
      );

      Alert.alert("Opgeslagen", "De pauze is bijgewerkt.");
    } catch (error) {
      Alert.alert(
        "Opslaan mislukt",
        error.message ||
          "De pauze kon niet worden opgeslagen."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Instellingen</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Pauze tussen afspraken
        </Text>

        <Text style={styles.cardText}>
          Tijd na elke afspraak waarin de therapeut en de
          kamer niet opnieuw geboekt kunnen worden,
          bijvoorbeeld om op te ruimen.
        </Text>

        <View style={styles.bufferRow}>
          <TextInput
            style={styles.input}
            value={buffer}
            onChangeText={setBuffer}
            keyboardType="number-pad"
            maxLength={3}
          />

          <Text style={styles.unit}>minuten</Text>

          <Pressable
            style={[
              styles.saveButton,
              isSaving && styles.disabled,
            ]}
            onPress={handleSaveBuffer}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Opslaan</Text>
            )}
          </Pressable>
        </View>
      </View>

      <Option
        title="Openingstijden"
        description="Wekelijkse openingstijden aanpassen"
        onPress={() =>
          router.push("/settings/opening-hours")
        }
      />

      <Option
        title="Speciale openingsdagen"
        description="Feestdagen en uitzonderlijke openingsuren"
        onPress={() =>
          router.push("/settings/special-opening-days")
        }
      />
    </ScrollView>
  );
}

function Option({ title, description, onPress }) {
  return (
    <Pressable style={styles.option} onPress={onPress}>
      <View>
        <Text style={styles.optionTitle}>{title}</Text>

        <Text style={styles.optionDescription}>
          {description}
        </Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  content: {
    padding: 24,
    paddingBottom: 48,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
  },

  card: {
    padding: 18,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },

  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
  },

  bufferRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },

  input: {
    width: 72,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
    textAlign: "center",
  },

  unit: {
    flex: 1,
    fontSize: 15,
    color: "#444",
  },

  saveButton: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  saveText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  disabled: {
    opacity: 0.6,
  },

  option: {
    minHeight: 80,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  optionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },

  optionDescription: {
    fontSize: 14,
    color: "#666",
  },

  arrow: {
    fontSize: 28,
    color: "#888",
  },
});
