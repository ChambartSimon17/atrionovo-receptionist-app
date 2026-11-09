import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
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
import {
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react-native";

import { useAuth } from "../context/auth-context";
import { Button } from "../components/ui";
import useWideLayout from "../hooks/useWideLayout";
import { t } from "../i18n";
import { colors, fonts, radius, spacing } from "../theme";

// ======================================================
// Login
// ======================================================
//
// One screen for restaurants and salons: the AtrioNovo logo,
// e-mail and password with icons, a show/hide eye, and an
// inline message when the login fails.
//
// On a tablet in landscape the form stands on the right
// of a green panel with the logo and what AtrioNovo does.
// ======================================================

// The logo mark on its own (for the green panel) and the
// app icon (the mark on green, above the form).
const LOGO = require("../../assets/images/splash-icon.png");
const ICON = require("../../assets/images/icon.png");

function Field({ label, icon: Icon, focused, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <Icon size={18} color={colors.textMuted} strokeWidth={1.8} />
        {children}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const wide = useWideLayout();
  const { login, isLoading } = useAuth();

  const passwordRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focus, setFocus] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    setError(null);

    if (!email.trim()) {
      setError(t("login.emailMissing"));
      return;
    }

    if (!password) {
      setError(t("login.passwordMissing"));
      return;
    }

    try {
      setIsSubmitting(true);

      await login(email.trim(), password);

      // "/" redirects to the home screen of the business type.
      router.replace("/");
    } catch (loginError) {
      setError(
        loginError?.status === 401 || loginError?.status === 400
          ? t("login.wrongCredentials")
          : loginError?.message || t("login.failed")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const form = (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {wide ? null : <Image source={ICON} style={styles.mark} />}

        <Text style={styles.brand}>AtrioNovo</Text>
        <Text style={styles.title}>{t("login.title")}</Text>
        <Text style={styles.subtitle}>{t("login.subtitle")}</Text>

        <Field label={t("login.email")} icon={Mail} focused={focus === "email"}>
          <TextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
            }}
            onFocus={() => setFocus("email")}
            onBlur={() => setFocus(null)}
            placeholder={t("login.emailPlaceholder")}
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            style={styles.input}
          />
        </Field>

        <Field label={t("login.password")} icon={Lock} focused={focus === "password"}>
          <TextInput
            ref={passwordRef}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
            onFocus={() => setFocus("password")}
            onBlur={() => setFocus(null)}
            placeholder={t("login.passwordPlaceholder")}
            placeholderTextColor={colors.textDisabled}
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            style={styles.input}
          />
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? t("login.hidePassword") : t("login.showPassword")
            }
            onPress={() => setShowPassword((value) => !value)}
          >
            {showPassword ? (
              <EyeOff size={18} color={colors.textMuted} strokeWidth={1.8} />
            ) : (
              <Eye size={18} color={colors.textMuted} strokeWidth={1.8} />
            )}
          </Pressable>
        </Field>

        <Button
          variant="primary"
          label={t("login.submit")}
          onPress={handleLogin}
          loading={isSubmitting}
          style={styles.submit}
        />

        {error ? (
          <View style={styles.error} accessibilityLiveRegion="polite">
            <CircleAlert size={16} color={colors.danger} strokeWidth={2} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (wide) {
    return (
      <View style={styles.wideRow}>
        <SafeAreaView style={styles.panel} edges={["top", "bottom", "left"]}>
          <Image source={LOGO} style={styles.panelLogo} resizeMode="contain" />
          <View style={styles.panelText}>
            <Text style={styles.panelBrand}>AtrioNovo</Text>
            <Text style={styles.panelTitle}>{t("login.panelTitle")}</Text>
            {t("login.panelPoints").map((point) => (
              <View key={point} style={styles.panelPoint}>
                <View style={styles.panelCheck}>
                  <Check size={14} color={colors.primary} strokeWidth={2.5} />
                </View>
                <Text style={styles.panelPointText}>{point}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.panelFooter}>atrionovo.com</Text>
        </SafeAreaView>

        <SafeAreaView style={styles.formSide} edges={["top", "bottom", "right"]}>
          {form}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {form}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
  },

  // Tablet in landscape: green panel left, form right

  wideRow: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.background,
  },

  panel: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingHorizontal: 64,
    paddingVertical: 56,
    justifyContent: "space-between",
  },

  panelLogo: {
    width: 72,
    height: 72,
  },

  panelText: {
    gap: spacing.lg,
    maxWidth: 520,
  },

  panelBrand: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.onPrimaryMuted,
  },

  panelTitle: {
    fontFamily: fonts.semibold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
    color: colors.onPrimary,
    marginBottom: spacing.md,
  },

  panelPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },

  panelCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.onPrimaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  panelPointText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 25,
    color: colors.onPrimary,
  },

  panelFooter: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.onPrimaryMuted,
  },

  formSide: {
    flex: 1,
    backgroundColor: colors.background,
  },

  mark: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },

  brand: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primary,
    marginTop: spacing.lg,
  },

  title: {
    fontFamily: fonts.semibold,
    fontSize: 30,
    letterSpacing: -0.6,
    color: colors.text,
    marginTop: spacing.xs,
  },

  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },

  field: {
    marginBottom: spacing.lg,
  },

  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  inputRowFocused: {
    borderColor: colors.primary,
  },

  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.md,
  },

  submit: {
    marginTop: spacing.sm,
  },

  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },

  errorText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
});
