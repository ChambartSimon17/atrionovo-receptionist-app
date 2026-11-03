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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check, X } from "lucide-react-native";

import { api } from "../../services/api";
import { useAuth } from "../../context/auth-context";
import { Button } from "../../components/ui";
import {
  colors,
  fonts,
  radius,
  spacing,
  touchTarget,
} from "../../theme";
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
// The bar at the bottom sums up the choice and confirms.
// ======================================================

export default function NewAppointmentScreen() {
  const router = useRouter();

  const { accessToken, business } = useAuth();

  const insets = useSafeAreaInsets();

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

  // The next two weeks to pick a day from.
  const days = Array.from({ length: 14 }, (_, index) =>
    addDays(today, index)
  );

  const service = services.find(
    (candidate) => candidate.id === serviceId
  );

  const step = !serviceId
    ? 1
    : !slot
      ? 2
      : !firstName.trim() ||
          !lastName.trim() ||
          !phoneNumber.trim()
        ? 3
        : 4;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sluiten"
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <X size={18} color={colors.text} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.topTitle}>Nieuwe afspraak</Text>
        <View style={styles.closeButtonSpacer} />
      </View>

      <View style={styles.progress}>
        {[1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={[
              styles.progressStep,
              index <= step && styles.progressStepDone,
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <SectionLabel number={1} title="Massage" />

          {services.length === 0 && (
            <Text style={styles.empty}>
              Je hebt nog geen massages. Voeg ze eerst toe
              bij "Massages en prijzen".
            </Text>
          )}

          <View style={styles.services}>
            {services.map((candidate) => {
              const selected = candidate.id === serviceId;

              return (
                <Pressable
                  key={candidate.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.serviceCard,
                    selected && styles.serviceCardSelected,
                  ]}
                  onPress={() => setServiceId(candidate.id)}
                >
                  <View style={styles.serviceText}>
                    <Text style={styles.serviceName}>
                      {candidate.name}
                    </Text>
                    <Text style={styles.serviceMeta}>
                      {formatDuration(
                        candidate.durationMinutes
                      )}
                    </Text>
                  </View>
                  <Text style={styles.servicePrice}>
                    {formatPrice(candidate.priceCents)}
                  </Text>
                  <View
                    style={[
                      styles.radio,
                      selected && styles.radioSelected,
                    ]}
                  >
                    {selected && (
                      <Check
                        size={14}
                        color={colors.onPrimary}
                        strokeWidth={2.5}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <SectionLabel number={2} title="Dag en tijd" />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayStrip}
          >
            {days.map((day) => {
              const selected = day === date;
              const [weekday, number] = formatLongDate(day)
                .split(" ");

              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setDate(day)}
                  style={[
                    styles.day,
                    selected && styles.daySelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayName,
                      selected && styles.onPrimary,
                    ]}
                  >
                    {day === today
                      ? "Vandaag"
                      : weekday.slice(0, 2)}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      selected && styles.onPrimary,
                    ]}
                  >
                    {number}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {!serviceId ? (
            <Text style={styles.empty}>
              Kies eerst een massage.
            </Text>
          ) : isLoadingSlots ? (
            <ActivityIndicator style={styles.slotLoading} />
          ) : slots.length === 0 ? (
            <Text style={styles.empty}>
              Geen vrije momenten op{" "}
              {formatLongDate(date)}.
            </Text>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((candidate) => {
                const selected =
                  slot?.startTime === candidate.startTime;

                return (
                  <Pressable
                    key={candidate.startTime}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.slot,
                      selected && styles.slotSelected,
                    ]}
                    onPress={() => setSlot(candidate)}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        selected && styles.slotTextSelected,
                      ]}
                    >
                      {candidate.time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Text style={styles.hint}>
            De therapeut en de kamer worden automatisch
            gekozen. Een voorkeur kun je in de notitie
            zetten.
          </Text>

          <SectionLabel number={3} title="Klant" />

          <View style={styles.card}>
            <View style={styles.nameRow}>
              <Field
                label="Voornaam"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                style={styles.flex}
              />
              <Field
                label="Achternaam"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                style={styles.flex}
              />
            </View>

            <Field
              label="Telefoonnummer"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="+32 470 12 34 56"
            />

            <Field
              label="E-mailadres (optioneel)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="naam@voorbeeld.be"
            />

            <Field
              label="Notitie (optioneel)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Bijvoorbeeld: liefst bij Anna"
              multiline
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + spacing.sm },
          ]}
        >
          <View style={styles.summary}>
            <Text style={styles.summaryTop} numberOfLines={1}>
              {slot
                ? `${formatLongDate(date)} · ${slot.time}`
                : "Kies een massage en tijd"}
            </Text>
            <Text style={styles.summaryMain} numberOfLines={1}>
              {service
                ? `${service.name} · ${formatPrice(
                    service.priceCents
                  )}`
                : "–"}
            </Text>
          </View>
          <Button
            label="Bevestigen"
            variant="primary"
            loading={isSaving}
            disabled={!serviceId || !slot}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionLabel({ number, title }) {
  return (
    <View style={styles.sectionLabel}>
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>{number}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Field({ label, style, ...inputProps }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={[
          styles.input,
          inputProps.multiline && styles.multiline,
        ]}
        placeholderTextColor={colors.textDisabled}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  flex: {
    flex: 1,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },

  closeButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonSpacer: {
    width: touchTarget,
  },

  topTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },

  progress: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },

  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8D3C9",
  },

  progressStepDone: {
    backgroundColor: colors.primary,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  sectionNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionNumberText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.onPrimary,
  },

  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  empty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },

  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },

  services: {
    gap: spacing.sm,
  },

  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 60,
    padding: spacing.md + 2,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  serviceCardSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  serviceText: {
    flex: 1,
    gap: 2,
  },

  serviceName: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },

  serviceMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },

  servicePrice: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  dayStrip: {
    gap: 6,
  },

  day: {
    minWidth: 58,
    height: 60,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  daySelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  dayName: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },

  dayNumber: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  onPrimary: {
    color: colors.onPrimary,
  },

  slotLoading: {
    marginVertical: spacing.md,
  },

  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  slot: {
    flexBasis: "22%",
    flexGrow: 1,
    minHeight: touchTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  slotSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  slotText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },

  slotTextSelected: {
    fontFamily: fonts.semibold,
    color: colors.primary,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md + 2,
  },

  nameRow: {
    flexDirection: "row",
    gap: spacing.md,
  },

  field: {
    gap: 6,
  },

  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },

  input: {
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.text,
  },

  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  summary: {
    flex: 1,
    gap: 2,
  },

  summaryTop: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },

  summaryMain: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
});
