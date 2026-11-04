import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";

import {
  colors,
  fonts,
  radius,
  touchTarget,
} from "../theme";
import {
  addDays,
  formatLongDate,
  todayString,
} from "../utils/date";

// ======================================================
// Day navigation
// ======================================================
//
// ‹  Vandaag  ›  — the arrows move one day, tapping the
// day in the middle jumps back to today.
// ======================================================

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function DayNavigation({ date, onChange }) {
  const isToday = date === todayString();

  return (
    <View style={styles.row}>
      <ArrowButton
        label="Vorige dag"
        onPress={() => onChange(addDays(date, -1))}
      >
        <ChevronLeft
          size={20}
          color={colors.text}
          strokeWidth={1.8}
        />
      </ArrowButton>

      <Pressable
        accessibilityRole="button"
        disabled={isToday}
        onPress={() => onChange(todayString())}
        style={styles.label}
      >
        <Text style={styles.title}>
          {isToday
            ? "Vandaag"
            : capitalize(formatLongDate(date))}
        </Text>
        {!isToday && (
          <Text style={styles.hint}>Tik voor vandaag</Text>
        )}
      </Pressable>

      <ArrowButton
        label="Volgende dag"
        onPress={() => onChange(addDays(date, 1))}
      >
        <ChevronRight
          size={20}
          color={colors.text}
          strokeWidth={1.8}
        />
      </ArrowButton>
    </View>
  );
}

function ArrowButton({ label, onPress, children }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.arrow,
        pressed && styles.arrowPressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  arrow: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  arrowPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  label: {
    flex: 1,
    minHeight: touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
});
