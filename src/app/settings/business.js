import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";

import { api } from "../../services/api";
import { useAuth } from "../../context/auth-context";
import {
  Button,
  ScreenHeader,
  SegmentedControl,
  SettingsGroup,
  SettingsRow,
  Sheet,
  Skeleton,
  Stepper,
  Switch,
} from "../../components/ui";
import { language as appLanguage, LANGUAGES, setLanguage, t } from "../../i18n";
import { getAppearance, setAppearance } from "../../theme/appearance";
import { colors, fonts, radius, spacing } from "../../theme";
import { BUSINESS_TYPES } from "../../utils/business-type";
import { useEmbedded } from "../../components/embedded";

// ======================================================
// Business settings
// ======================================================
//
// Restaurantgegevens or Salongegevens: one screen for
// both business types, in grouped sections like the iOS
// settings app.
//
//   card        initials, name and type
//   Algemeen    name; capacity (restaurant) or the pause
//               between appointments (salon)
//   Regio       time zone (picker) and the language the
//               AI receptionist speaks
//   AI          the receptionist switch, saved right away
//   App         appearance and app language, stored on
//               this phone
// ======================================================

const TIMEZONES = [
  { value: "Europe/Brussels", label: "Brussel" },
  { value: "Europe/Amsterdam", label: "Amsterdam" },
  { value: "Europe/Luxembourg", label: "Luxemburg" },
  { value: "Europe/Paris", label: "Parijs" },
  { value: "Europe/Berlin", label: "Berlijn" },
  { value: "Europe/London", label: "Londen" },
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Europe/Lisbon", label: "Lissabon" },
];

function initials(name) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("") || "?"
  );
}

function timezoneLabel(value) {
  return TIMEZONES.find((zone) => zone.value === value)?.label ?? value;
}

export default function BusinessSettingsScreen() {
  // Next to Meer on a tablet: use the whole pane.
  const embedded = useEmbedded();
  const { accessToken, business, businessType, updateBusiness } = useAuth();

  const isMassage = businessType === BUSINESS_TYPES.MASSAGE;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tableSummary, setTableSummary] = useState(null);

  const [name, setName] = useState("");
  const [maxCapacity, setMaxCapacity] = useState(40);
  const [buffer, setBuffer] = useState(0);
  const [timezone, setTimezone] = useState("Europe/Brussels");
  const [language, setBusinessLanguage] = useState("nl");
  const [voiceAgentEnabled, setVoiceAgentEnabled] = useState(true);
  const [isTogglingVoice, setIsTogglingVoice] = useState(false);
  const [pickingTimezone, setPickingTimezone] = useState(false);

  const [saved, setSaved] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.getMyBusiness(accessToken);
      const data = response?.data || response;

      setName(data.name ?? "");
      setMaxCapacity(Number(data.maxCapacity) || 40);
      setBuffer(Number(data.appointmentBufferMinutes) || 0);
      setTimezone(data.timezone || "Europe/Brussels");
      setBusinessLanguage(data.language || "nl");
      setVoiceAgentEnabled(data.voiceAgentEnabled ?? true);
      setSaved({
        name: data.name ?? "",
        maxCapacity: Number(data.maxCapacity) || 40,
        buffer: Number(data.appointmentBufferMinutes) || 0,
        timezone: data.timezone || "Europe/Brussels",
        language: data.language || "nl",
      });

      if (!isMassage && data.id) {
        api
          .getTables(data.id, accessToken)
          .then((tablesResponse) => {
            const tables = (tablesResponse?.data || tablesResponse || []).filter(
              (table) => table.isActive !== false
            );
            setTableSummary({
              count: tables.length,
              seats: tables.reduce((sum, table) => sum + (table.capacity || 0), 0),
            });
          })
          .catch(() => {});
      }
    } catch (error) {
      Alert.alert(t("common.error"), error?.message || t("business.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, isMassage]);

  useEffect(() => {
    load();
  }, [load]);

  const isDirty =
    saved &&
    (name !== saved.name ||
      maxCapacity !== saved.maxCapacity ||
      buffer !== saved.buffer ||
      timezone !== saved.timezone ||
      language !== saved.language);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(t("business.invalid"), t("business.nameRequired"));
      return;
    }

    const changes = isMassage
      ? {
          name: name.trim(),
          timezone,
          language,
          appointmentBufferMinutes: buffer,
        }
      : {
          name: name.trim(),
          maxCapacity,
          timezone,
          language,
        };

    try {
      setIsSaving(true);
      await api.updateMyBusiness(changes, accessToken);
      updateBusiness(changes);
      setSaved({ name: name.trim(), maxCapacity, buffer, timezone, language });
    } catch (error) {
      Alert.alert(t("common.error"), error?.message || t("business.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleVoiceAgent(next) {
    setVoiceAgentEnabled(next);
    setIsTogglingVoice(true);

    try {
      const response = await api.setVoiceAgentEnabled(next, accessToken);
      const data = response?.data || response;
      setVoiceAgentEnabled(data?.voiceAgentEnabled ?? next);
      updateBusiness({ voiceAgentEnabled: data?.voiceAgentEnabled ?? next });
    } catch (error) {
      setVoiceAgentEnabled(!next);
      Alert.alert(t("business.voiceNotSaved"), error?.message || t("common.tryAgain"));
    } finally {
      setIsTogglingVoice(false);
    }
  }

  const title = isMassage ? t("business.titleMassage") : t("business.titleRestaurant");

  const subtitle = isMassage
    ? t("business.typeMassage")
    : tableSummary
      ? t("business.typeRestaurantTables", tableSummary)
      : t("business.typeRestaurant");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={[styles.header, embedded && styles.fill]}>
        <ScreenHeader title={title} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, embedded && styles.fill]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {initials(name || business?.name || "")}
            </Text>
          </View>
          <View style={styles.identityText}>
            {isLoading ? (
              <>
                <Skeleton width="60%" height={16} />
                <Skeleton width="40%" height={12} style={styles.gap} />
              </>
            ) : (
              <>
                <Text style={styles.identityName} numberOfLines={1}>
                  {name || business?.name}
                </Text>
                <Text style={styles.identitySub}>{subtitle}</Text>
              </>
            )}
          </View>
        </View>

        <SettingsGroup label={t("business.general")}>
          <SettingsRow label={t("business.name")}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={title}
              placeholderTextColor={colors.textDisabled}
              style={styles.inlineInput}
              returnKeyType="done"
              editable={!isLoading}
            />
          </SettingsRow>
          {isMassage ? (
            <SettingsRow
              label={t("business.buffer")}
              hint={t("business.bufferHint")}
            >
              <Stepper
                value={buffer}
                onChange={setBuffer}
                min={0}
                max={60}
                step={5}
                suffix="min"
              />
            </SettingsRow>
          ) : (
            <SettingsRow
              label={t("business.capacity")}
              hint={t("business.capacityHint")}
            >
              <Stepper
                value={maxCapacity}
                onChange={setMaxCapacity}
                min={1}
                max={500}
              />
            </SettingsRow>
          )}
        </SettingsGroup>

        <SettingsGroup label={t("business.region")}>
          <SettingsRow
            label={t("business.timezone")}
            value={timezoneLabel(timezone)}
            onPress={() => setPickingTimezone(true)}
          />
          <SettingsRow label={t("business.language")} hint={t("business.languageHint")}>
            <View style={styles.segment}>
            <SegmentedControl
              options={LANGUAGES}
              value={language}
              onChange={setBusinessLanguage}
            />
            </View>
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup
          label={t("business.ai")}
          footer={
            voiceAgentEnabled ? t("business.aiOnFooter") : t("business.aiOffFooter")
          }
        >
          <SettingsRow label={t("business.aiAnswers")}>
            <Switch
              value={voiceAgentEnabled}
              onValueChange={toggleVoiceAgent}
              disabled={isTogglingVoice || isLoading}
            />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup label={t("business.app")} footer={t("business.appFooter")}>
          <SettingsRow label={t("business.appearance")}>
            <View style={styles.segment}>
            <SegmentedControl
              options={[
                { value: "automatic", label: t("business.appearanceAuto") },
                { value: "light", label: t("business.appearanceLight") },
                { value: "dark", label: t("business.appearanceDark") },
              ]}
              value={getAppearance()}
              onChange={setAppearance}
            />
            </View>
          </SettingsRow>
          <SettingsRow label={t("business.appLanguage")}>
            <View style={styles.segment}>
            <SegmentedControl
              options={LANGUAGES}
              value={appLanguage}
              onChange={setLanguage}
            />
            </View>
          </SettingsRow>
        </SettingsGroup>

        <Button
          variant="primary"
          label={isDirty ? t("business.save") : t("business.saved")}
          onPress={handleSave}
          loading={isSaving}
          disabled={!isDirty || isLoading}
          style={styles.save}
        />
      </ScrollView>

      <Sheet
        visible={pickingTimezone}
        onClose={() => setPickingTimezone(false)}
        title={t("business.timezone")}
      >
        <SettingsGroup>
          {TIMEZONES.map((zone) => (
            <Pressable
              key={zone.value}
              accessibilityRole="button"
              onPress={() => {
                setTimezone(zone.value);
                setPickingTimezone(false);
              }}
              style={({ pressed }) => [styles.zone, pressed && styles.zonePressed]}
            >
              <View style={styles.zoneText}>
                <Text style={styles.zoneLabel}>{zone.label}</Text>
                <Text style={styles.zoneValue}>{zone.value}</Text>
              </View>
              {zone.value === timezone ? (
                <Check size={18} color={colors.primary} strokeWidth={2.2} />
              ) : null}
            </Pressable>
          ))}
        </SettingsGroup>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },

  fill: {
    maxWidth: "100%",
  },

  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.primary,
  },

  identityText: {
    flex: 1,
  },

  identityName: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
  },

  identitySub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },

  gap: {
    marginTop: spacing.sm,
  },

  inlineInput: {
    flex: 1.4,
    textAlign: "right",
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.sm,
  },

  save: {
    marginTop: spacing.xxl,
  },

  segment: {
    width: 176,
  },

  zone: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },

  zonePressed: {
    backgroundColor: colors.surfaceMuted,
  },

  zoneText: {
    flex: 1,
  },

  zoneLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },

  zoneValue: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
