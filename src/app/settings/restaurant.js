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
import { useEffect, useState } from "react";

import { api } from "../../services/api";
import { useAuth } from "../../context/auth-context";

export default function RestaurantSettingsScreen() {
  const { accessToken } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [timezone, setTimezone] = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    loadRestaurant();
  }, []);

  async function loadRestaurant() {
    try {
      const response =
        await api.getMyRestaurant(accessToken);

      const restaurant = response.data;

      setName(restaurant.name ?? "");
      setMaxCapacity(
        String(restaurant.maxCapacity ?? "")
      );
      setTimezone(restaurant.timezone ?? "");
      setLanguage(restaurant.language ?? "");
    } catch (error) {
      console.error(
        "Failed to load restaurant:",
        error
      );

      Alert.alert(
        "Fout",
        error.message ||
          "De restaurantgegevens konden niet worden geladen."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(
        "Ongeldige gegevens",
        "Restaurantnaam is verplicht."
      );
      return;
    }

    if (
      !maxCapacity ||
      Number(maxCapacity) <= 0
    ) {
      Alert.alert(
        "Ongeldige gegevens",
        "Maximale capaciteit moet groter zijn dan 0."
      );
      return;
    }

    try {
      setIsSaving(true);

      await api.updateMyRestaurant(
        {
          name: name.trim(),
          maxCapacity: Number(maxCapacity),
          timezone: timezone.trim(),
          language: language.trim(),
        },
        accessToken
      );

      Alert.alert(
        "Opgeslagen",
        "De restaurantgegevens zijn bijgewerkt."
      );
    } catch (error) {
      console.error(
        "Failed to update restaurant:",
        error
      );

      Alert.alert(
        "Fout",
        error.message ||
          "De restaurantgegevens konden niet worden opgeslagen."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
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
        Restaurant
      </Text>

      <Text style={styles.description}>
        Beheer de basisgegevens van je restaurant.
      </Text>

      <View style={styles.section}>
        <SettingField
          label="Restaurantnaam"
          value={name}
          onChangeText={setName}
        />

        <SettingField
          label="Maximale capaciteit"
          value={maxCapacity}
          onChangeText={setMaxCapacity}
          keyboardType="numeric"
        />

        <SettingField
          label="Tijdzone"
          value={timezone}
          onChangeText={setTimezone}
          autoCapitalize="none"
        />

        <SettingField
          label="Taal"
          value={language}
          onChangeText={setLanguage}
          autoCapitalize="none"
        />
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
          <Text style={styles.saveButtonText}>
            Opslaan
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function SettingField({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={
          keyboardType || "default"
        }
        autoCapitalize={
          autoCapitalize || "sentences"
        }
      />
    </View>
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
    marginBottom: 32,
  },

  section: {
    gap: 18,
  },

  field: {
    gap: 7,
  },

  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },

  saveButton: {
    height: 52,
    borderRadius: 10,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
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