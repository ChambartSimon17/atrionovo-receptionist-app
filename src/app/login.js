import { useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../context/auth-context";

export default function LoginScreen() {
  const router = useRouter();

  const {
    login,
    isLoading,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleLogin() {
    setError(null);

    if (!email.trim()) {
      setError(
        "Vul je e-mailadres in."
      );
      return;
    }

    if (!password) {
      setError(
        "Vul je wachtwoord in."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await login(
        email.trim(),
        password
      );

      router.replace("/dashboard");
    } catch (error) {
      setError(
        error?.message ||
          "Inloggen mislukt."
      );
    } finally {
      setIsSubmitting(false);
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View style={styles.content}>
        <Text style={styles.logo}>
          AtrioNovo
        </Text>

        <Text style={styles.title}>
          Welkom terug
        </Text>

        <Text style={styles.subtitle}>
          Log in om je restaurant te beheren.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>
            E-mailadres
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="naam@restaurant.be"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.label}>
            Wachtwoord
          </Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Wachtwoord"
            placeholderTextColor="#999"
            secureTextEntry
            autoComplete="password"
            style={styles.input}
          />

          {error && (
            <Text style={styles.error}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              isSubmitting &&
                styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                Inloggen
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  logo: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 36,
  },

  form: {
    gap: 10,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },

  error: {
    color: "#d32f2f",
    fontSize: 14,
    marginTop: 8,
  },

  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});