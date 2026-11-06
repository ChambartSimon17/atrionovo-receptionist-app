import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Delete } from "lucide-react-native";

import { colors, fonts, radius, spacing } from "../../theme";

// ======================================================
// PinPad
// ======================================================
//
// Four dots and a number pad. onComplete(pin) fires when
// the fourth digit is entered. Changing shakeKey shakes
// the dots (a wrong PIN).
//
// leftLabel / onLeft: the key left of 0 ("Vergeten?").
// ======================================================

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function PinPad({ value, onChange, onComplete, shakeKey, disabled, leftLabel, onLeft }) {
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shakeKey) {
      return;
    }

    Animated.sequence(
      [10, -10, 8, -8, 4, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 50, useNativeDriver: true })
      )
    ).start();
  }, [shakeKey, shake]);

  function press(digit) {
    if (disabled || value.length >= 4) {
      return;
    }

    const next = value + digit;

    onChange(next);

    if (next.length === 4) {
      onComplete(next);
    }
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
        {[0, 1, 2, 3].map((index) => (
          <View key={index} style={[styles.dot, index < value.length && styles.dotFilled]} />
        ))}
      </Animated.View>

      <View style={styles.pad}>
        {KEYS.map((digit) => (
          <Key key={digit} label={digit} onPress={() => press(digit)} disabled={disabled} />
        ))}

        {leftLabel ? (
          <Pressable accessibilityRole="button" onPress={onLeft} style={styles.ghostKey}>
            <Text style={styles.ghostText}>{leftLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.ghostKey} />
        )}

        <Key label="0" onPress={() => press("0")} disabled={disabled} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Wissen"
          onPress={() => onChange(value.slice(0, -1))}
          style={styles.ghostKey}
        >
          <Delete size={22} color={colors.textMuted} strokeWidth={1.8} />
        </Pressable>
      </View>
    </View>
  );
}

function Key({ label, onPress, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );
}

const KEY = 68;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },

  dots: {
    flexDirection: "row",
    gap: 16,
    marginBottom: spacing.xl,
  },

  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
  },

  dotFilled: {
    backgroundColor: colors.primary,
  },

  pad: {
    width: KEY * 3 + 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  key: {
    width: KEY,
    height: 58,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  keyPressed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },

  keyText: {
    fontFamily: fonts.medium,
    fontSize: 24,
    color: colors.text,
  },

  ghostKey: {
    width: KEY,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },

  ghostText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
});
