import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { locale } from "../../i18n";
import { colors, fonts, radius, spacing } from "../../theme";

// ======================================================
// DateRangePicker
// ======================================================
//
// A month calendar. The first tap picks the start (one
// day), a second tap the end of a period; the next tap
// starts over. Dates are "YYYY-MM-DD" strings.
// ======================================================

function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function fromKey(key) {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day, 12);
}

function monthDays(year, month) {
  const first = new Date(year, month, 1, 12);
  // Monday first.
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();

  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: count }, (_, index) =>
      toKey(new Date(year, month, index + 1, 12))
    ),
  ];
}

const WEEKDAYS = Array.from({ length: 7 }, (_, index) =>
  new Date(2024, 0, 1 + index, 12)
    .toLocaleDateString(locale, { weekday: "narrow" })
    .toUpperCase()
);

export default function DateRangePicker({ start, end, onChange, minDate }) {
  const initial = fromKey(start || toKey(new Date()));
  // The next tap picks the start, or the end.
  const [pickingEnd, setPickingEnd] = useState(false);

  const [month, setMonth] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });

  const days = monthDays(month.year, month.month);
  const title = new Date(month.year, month.month, 1, 12).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  function shift(delta) {
    setMonth((current) => {
      const next = new Date(current.year, current.month + delta, 1, 12);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function pick(key) {
    if (!pickingEnd || key < start) {
      onChange({ start: key, end: key });
      setPickingEnd(true);
      return;
    }

    onChange({ start, end: key });
    setPickingEnd(false);
  }

  return (
    <View>
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="‹"
          onPress={() => shift(-1)}
          hitSlop={8}
          style={styles.arrow}
        >
          <ChevronLeft size={18} color={colors.text} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="›"
          onPress={() => shift(1)}
          hitSlop={8}
          style={styles.arrow}
        >
          <ChevronRight size={18} color={colors.text} strokeWidth={1.8} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((weekday, index) => (
          <Text key={`w${index}`} style={styles.weekday}>
            {weekday}
          </Text>
        ))}

        {days.map((key, index) => {
          if (!key) {
            return <View key={`e${index}`} style={styles.cell} />;
          }

          const disabled = minDate && key < minDate;
          const isEdge = key === start || key === end;
          const inRange = start && end && key > start && key < end;

          return (
            <Pressable
              key={key}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: isEdge || inRange, disabled }}
              onPress={() => pick(key)}
              style={[styles.cell, inRange && styles.inRange]}
            >
              <View style={[styles.day, isEdge && styles.edge]}>
                <Text
                  style={[
                    styles.dayText,
                    disabled && styles.disabled,
                    isEdge && styles.edgeText,
                  ]}
                >
                  {Number(key.slice(8))}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  arrow: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    textTransform: "capitalize",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  weekday: {
    width: "14.28%",
    textAlign: "center",
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    paddingVertical: spacing.xs,
  },

  cell: {
    width: "14.28%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  inRange: {
    backgroundColor: colors.primarySoft,
  },

  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  edge: {
    backgroundColor: colors.primary,
  },

  dayText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },

  edgeText: {
    color: colors.onPrimary,
    fontFamily: fonts.semibold,
  },

  disabled: {
    color: colors.textDisabled,
  },
});
