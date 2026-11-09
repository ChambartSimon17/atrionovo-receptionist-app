import { useCallback, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { CircleCheck } from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import { Button, Card, Switch } from "../../components/ui";
import { t } from "../../i18n";
import { colors, fonts, radius, spacing, type } from "../../theme";
import { useEmbedded } from "../../components/embedded";

// ======================================================
// Facturatie (salon)
// ======================================================
//
// The business's own details on its receipts and
// invoices: legal name, VAT number (checked in VIES),
// address, IBAN, the address customers reply to, and the
// VAT rate or the small-business exemption.
// ======================================================

export default function InvoicingScreen() {
  // Next to Meer on a tablet: use the whole pane.
  const embedded = useEmbedded();
  const { business, accessToken } = useAuth();

  const [form, setForm] = useState(null);
  const [status, setStatus] = useState(null);
  const [vatState, setVatState] = useState(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api
        .getInvoicing(business.id, accessToken)
        .then((response) => {
          setForm(response.data);
          setStatus(response.data);
        })
        .catch((error) => Alert.alert(t("common.error"), error.message));
    }, [business?.id, accessToken])
  );

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));

    if (field === "vatNumber") {
      setVatState(null);
    }
  }

  async function checkVat() {
    setVatState("checking");

    try {
      const response = await api.lookupVat(business.id, form.vatNumber, accessToken);
      const result = response.data;

      if (result.valid) {
        setVatState("valid");
        setForm((current) => ({
          ...current,
          vatNumber: result.vatNumber,
          legalName: current.legalName || result.name || "",
          street: current.street || result.street || "",
          postalCode: current.postalCode || result.postalCode || "",
          city: current.city || result.city || "",
        }));
      } else {
        setVatState(result.reason === "FORMAT" ? "format" : result.valid === false ? "invalid" : "unavailable");
      }
    } catch {
      setVatState("unavailable");
    }
  }

  async function save() {
    setSaving(true);

    try {
      const response = await api.updateInvoicing(business.id, form, accessToken);

      setForm(response.data);
      setStatus(response.data);
      Alert.alert(t("invoicing.saved"));
    } catch (error) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <SafeAreaView style={styles.screen} edges={[]}>
        <ActivityIndicator style={styles.loading} />
      </SafeAreaView>
    );
  }

  const vatMessage = {
    checking: t("invoicing.checking"),
    valid: t("invoicing.valid"),
    invalid: t("invoicing.invalid"),
    format: t("invoicing.badFormat"),
    unavailable: t("invoicing.unavailable"),
  }[vatState];

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[styles.content, embedded && styles.fill]} keyboardShouldPersistTaps="handled">
          <Text style={type.title}>{t("invoicing.title")}</Text>
          <Text style={type.body}>{t("invoicing.intro")}</Text>

          <Text style={styles.label}>{t("invoicing.business")}</Text>

          <Field
            label={t("invoicing.vatNumber")}
            value={form.vatNumber}
            onChangeText={(value) => update("vatNumber", value)}
            placeholder="BE 0123.456.789"
            autoCapitalize="characters"
            action={
              <Pressable
                accessibilityRole="button"
                onPress={checkVat}
                disabled={!form.vatNumber || vatState === "checking"}
                style={styles.check}
              >
                {vatState === "valid" ? (
                  <CircleCheck size={18} color={colors.primary} strokeWidth={2} />
                ) : (
                  <Text style={styles.checkText}>{t("invoicing.check")}</Text>
                )}
              </Pressable>
            }
          />
          {vatMessage ? (
            <Text style={[styles.hint, vatState === "valid" ? styles.ok : vatState !== "checking" && styles.warn]}>
              {vatMessage}
            </Text>
          ) : null}

          <Field
            label={t("invoicing.legalName")}
            value={form.legalName}
            onChangeText={(value) => update("legalName", value)}
            placeholder={t("invoicing.legalNamePlaceholder")}
          />
          <Field label={t("invoicing.street")} value={form.street} onChangeText={(value) => update("street", value)} />
          <View style={styles.row}>
            <Field
              style={styles.postal}
              label={t("invoicing.postalCode")}
              value={form.postalCode}
              onChangeText={(value) => update("postalCode", value)}
              keyboardType="number-pad"
            />
            <Field
              style={styles.flex}
              label={t("invoicing.city")}
              value={form.city}
              onChangeText={(value) => update("city", value)}
            />
          </View>
          <Field
            label={t("invoicing.iban")}
            value={form.iban}
            onChangeText={(value) => update("iban", value)}
            placeholder="BE68 5390 0754 7034"
            autoCapitalize="characters"
          />
          <Field
            label={t("invoicing.email")}
            value={form.email}
            onChangeText={(value) => update("email", value)}
            placeholder="info@jouwzaak.be"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t("invoicing.vat")}</Text>
          <Card style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={[type.body, styles.flex]}>{t("invoicing.exempt")}</Text>
              <Switch value={form.vatExempt} onValueChange={(value) => update("vatExempt", value)} />
            </View>
            {form.vatExempt ? (
              <Text style={type.caption}>{t("invoicing.exemptHint")}</Text>
            ) : (
              <View style={styles.rates}>
                <Text style={[type.body, styles.flex]}>{t("invoicing.vatRate")}</Text>
                {[21, 6].map((rate) => (
                  <Pressable
                    key={rate}
                    accessibilityRole="button"
                    onPress={() => update("vatRate", rate)}
                    style={[styles.rate, form.vatRate === rate && styles.rateOn]}
                  >
                    <Text style={[styles.rateText, form.vatRate === rate && styles.rateTextOn]}>{rate}%</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>

          <Text style={styles.label}>{t("invoicing.peppol")}</Text>
          <Card style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={[type.body, styles.flex]}>{t("invoicing.peppol")}</Text>
              <View style={[styles.badge, status?.peppolConfigured ? styles.badgeOn : styles.badgeOff]}>
                <Text style={[styles.badgeText, status?.peppolConfigured ? styles.badgeTextOn : styles.badgeTextOff]}>
                  {status?.peppolConfigured ? t("invoicing.peppolActive") : t("invoicing.peppolSoon")}
                </Text>
              </View>
            </View>
            {!status?.peppolConfigured ? <Text style={type.caption}>{t("invoicing.peppolOff")}</Text> : null}
            {!status?.mailConfigured ? <Text style={[type.caption, styles.warn]}>{t("invoicing.mailOff")}</Text> : null}
          </Card>

          <Button label={t("common.save")} variant="primary" loading={saving} onPress={save} style={styles.save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, style, action, ...input }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        <TextInput
          {...input}
          value={input.value ?? ""}
          placeholderTextColor={colors.textDisabled}
          autoCorrect={false}
          style={styles.input}
        />
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  flex: {
    flex: 1,
  },

  loading: {
    marginTop: spacing.xxl,
  },

  content: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
    gap: spacing.sm,
  },

  fill: {
    maxWidth: "100%",
  },

  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginLeft: spacing.xs,
  },

  field: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },

  fieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },

  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    height: 34,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },

  check: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },

  checkText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },

  hint: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },

  ok: {
    color: colors.primary,
  },

  warn: {
    color: colors.warning,
  },

  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  postal: {
    width: 110,
  },

  card: {
    gap: spacing.sm,
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  rates: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  rate: {
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },

  rateOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  rateText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },

  rateTextOn: {
    color: colors.onPrimary,
  },

  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  badgeOn: {
    backgroundColor: colors.primarySoft,
  },

  badgeOff: {
    backgroundColor: colors.surfaceMuted,
  },

  badgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },

  badgeTextOn: {
    color: colors.primary,
  },

  badgeTextOff: {
    color: colors.textMuted,
  },

  save: {
    marginTop: spacing.lg,
  },
});
