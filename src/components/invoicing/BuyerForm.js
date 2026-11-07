import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CircleCheck } from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import { t } from "../../i18n";
import { colors, fonts, radius, spacing } from "../../theme";

// ======================================================
// BuyerForm
// ======================================================
//
// The customer's company on an invoice. Typing the VAT
// number and tapping "Controleren" fills in the name and
// address from the EU VAT register (VIES).
//
// value: { name, vatNumber, street, postalCode, city,
//          country, email }
// ======================================================

export const EMPTY_BUYER = {
  name: "",
  vatNumber: "",
  street: "",
  postalCode: "",
  city: "",
  country: "BE",
  email: "",
};

export function buyerIsComplete(buyer) {
  return Boolean(buyer.name?.trim() && buyer.street?.trim() && buyer.city?.trim());
}

export default function BuyerForm({ value, onChange }) {
  const { business, accessToken } = useAuth();
  const [state, setState] = useState(null);

  function set(field, text) {
    onChange({ ...value, [field]: text });

    if (field === "vatNumber") {
      setState(null);
    }
  }

  async function check() {
    setState("checking");

    try {
      const response = await api.lookupVat(business.id, value.vatNumber, accessToken);
      const result = response.data;

      if (result.valid) {
        setState("valid");
        onChange({
          ...value,
          vatNumber: result.vatNumber,
          name: result.name || value.name,
          street: result.street || value.street,
          postalCode: result.postalCode || value.postalCode,
          city: result.city || value.city,
          country: result.country || value.country,
        });
      } else {
        setState(result.reason === "FORMAT" ? "format" : result.valid === false ? "invalid" : "unavailable");
      }
    } catch {
      setState("unavailable");
    }
  }

  const message = {
    checking: t("invoicing.checking"),
    valid: t("invoicing.filledIn"),
    invalid: t("invoicing.invalid"),
    format: t("invoicing.badFormat"),
    unavailable: t("invoicing.unavailable"),
  }[state];

  return (
    <View style={styles.form}>
      <Field
        label={t("invoicing.vatNumber")}
        value={value.vatNumber}
        onChangeText={(text) => set("vatNumber", text)}
        placeholder="BE 0123.456.789"
        autoCapitalize="characters"
        action={
          <Pressable
            accessibilityRole="button"
            onPress={check}
            disabled={!value.vatNumber || state === "checking"}
            style={styles.check}
          >
            {state === "valid" ? (
              <CircleCheck size={18} color={colors.primary} strokeWidth={2} />
            ) : (
              <Text style={styles.checkText}>{t("invoicing.check")}</Text>
            )}
          </Pressable>
        }
      />
      {message ? (
        <Text style={[styles.hint, state === "valid" ? styles.ok : state !== "checking" && styles.warn]}>
          {message}
        </Text>
      ) : null}

      <Field label={t("proof.company")} value={value.name} onChangeText={(text) => set("name", text)} />
      <Field label={t("invoicing.street")} value={value.street} onChangeText={(text) => set("street", text)} />
      <View style={styles.row}>
        <Field
          style={styles.postal}
          label={t("invoicing.postalCode")}
          value={value.postalCode}
          onChangeText={(text) => set("postalCode", text)}
        />
        <Field
          style={styles.flex}
          label={t("invoicing.city")}
          value={value.city}
          onChangeText={(text) => set("city", text)}
        />
      </View>
      <Field
        label={t("proof.email")}
        value={value.email}
        onChangeText={(text) => set("email", text)}
        keyboardType="email-address"
        autoCapitalize="none"
      />
    </View>
  );
}

export function Field({ label, style, action, ...input }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
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
  form: {
    gap: 6,
  },

  flex: {
    flex: 1,
  },

  row: {
    flexDirection: "row",
    gap: 6,
  },

  postal: {
    width: 100,
  },

  field: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: 2,
  },

  label: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.textMuted,
  },

  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    height: 32,
    fontFamily: fonts.regular,
    fontSize: 14,
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
});
