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
import { colors, fonts, radius, spacing } from "../../theme";
import { settingsStyles } from "../../theme/settingsStyles";

// ======================================================
// Massage settings
// ======================================================
//
// Everything a massage business sets up lives here: the
// massages and prices, the therapists, the treatment rooms,
// the buffer and the opening hours.
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

      <Option
        title="Massages en prijzen"
        description="Beheer je aanbod, duur en prijs"
        onPress={() => router.push("/massage/services")}
      />

      <Option
        title="Therapeuten"
        description="Wie welke massages geeft en wanneer"
        onPress={() => router.push("/massage/therapists")}
      />

      <Option
        title="Behandelkamers"
        description="Kamers en welke massages erin kunnen"
        onPress={() => router.push("/massage/rooms")}
      />

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
      <View style={styles.optionTextBlock}>
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
  ...settingsStyles,

  title: {
    ...settingsStyles.title,
    marginBottom: spacing.xl,
  },

  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs + 2,
  },

  cardText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },

  bufferRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    marginTop: spacing.md + 2,
  },

  input: {
    ...settingsStyles.input,
    width: 72,
    textAlign: "center",
  },

  unit: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },

  saveButton: {
    minHeight: 44,
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg + 2,
  },

  saveText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.onPrimary,
  },

  option: {
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  optionTextBlock: {
    flex: 1,
  },

  optionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },

  optionDescription: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },

  arrow: {
    fontSize: 26,
    color: colors.textMuted,
  },
});
