import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { Button, Sheet } from "./ui";
import { locale, t } from "../i18n";
import { colors, fonts, radius, spacing } from "../theme";
import { todayString } from "../utils/date";

// ======================================================
// CalendarSheet
// ======================================================
//
// A month calendar in a sheet, to jump to any day. Each
// day shows how many bookings it has; loadCounts(year,
// month) returns { "2026-11-06": 7 } (month 1-12).
//
// Tap a day to select it, then "Naar vrijdag 13" opens
// it. "Vandaag" goes straight to today.
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
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();

  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: count }, (_, index) => toKey(new Date(year, month, index + 1, 12))),
  ];
}

const WEEKDAYS = Array.from({ length: 7 }, (_, index) =>
  new Date(2024, 0, 1 + index, 12).toLocaleDateString(locale, { weekday: "narrow" }).toUpperCase()
);

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function CalendarSheet({ visible, date, onSelect, onClose, loadCounts }) {
  const today = todayString();

  const [selected, setSelected] = useState(date);
  const [month, setMonth] = useState(() => ({
    year: fromKey(date).getFullYear(),
    month: fromKey(date).getMonth(),
  }));
  const [counts, setCounts] = useState({});

  // Start from the open day every time the sheet opens.
  useEffect(() => {
    if (visible) {
      setSelected(date);
      setMonth({ year: fromKey(date).getFullYear(), month: fromKey(date).getMonth() });
    }
  }, [visible, date]);

  useEffect(() => {
    if (!visible || !loadCounts) {
      return;
    }

    let active = true;

    loadCounts(month.year, month.month + 1)
      .then((result) => active && setCounts(result ?? {}))
      .catch(() => active && setCounts({}));

    return () => {
      active = false;
    };
  }, [visible, month.year, month.month, loadCounts]);

  function shift(delta) {
    setMonth((current) => {
      const next = new Date(current.year, current.month + delta, 1, 12);

      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  const days = monthDays(month.year, month.month);

  const title = capitalize(
    new Date(month.year, month.month, 1, 12).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    })
  );

  const selectedLabel = fromKey(selected).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      footer={
        <View style={styles.footer}>
          <Button
            label={t("calendar.today")}
            onPress={() => onSelect(today)}
            style={styles.footerButton}
          />
          <Button
            label={t("calendar.goTo", { day: selectedLabel })}
            variant="primary"
            onPress={() => onSelect(selected)}
            style={styles.footerButtonWide}
          />
        </View>
      }
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("calendar.previousMonth")}
          onPress={() => shift(-1)}
          hitSlop={8}
          style={styles.arrow}
        >
          <ChevronLeft size={20} color={colors.text} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("calendar.nextMonth")}
          onPress={() => shift(1)}
          hitSlop={8}
          style={styles.arrow}
        >
          <ChevronRight size={20} color={colors.text} strokeWidth={1.8} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((weekday, index) => (
          <Text key={`w${index}`} style={styles.weekday}>
            {weekday}
          </Text>
        ))}

        {days.map((day, index) => {
          if (!day) {
            return <View key={`e${index}`} style={styles.cell} />;
          }

          const isSelected = day === selected;
          const count = counts[day];

          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelected(day)}
              style={[
                styles.cell,
                styles.dayCell,
                day === today && styles.today,
                isSelected && styles.selected,
              ]}
            >
              <Text
                style={[
                  styles.number,
                  day < today && styles.past,
                  isSelected && styles.selectedText,
                ]}
              >
                {fromKey(day).getDate()}
              </Text>
              <Text style={[styles.count, isSelected && styles.selectedCount]}>
                {count ? count : " "}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>{t("calendar.countHint")}</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },

  title: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
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

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  weekday: {
    width: "14.28%",
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
    paddingVertical: spacing.xs,
  },

  cell: {
    width: "14.28%",
    height: 48,
  },

  dayCell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
  },

  today: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },

  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  number: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },

  past: {
    color: colors.textDisabled,
  },

  selectedText: {
    color: colors.onPrimary,
    fontFamily: fonts.semibold,
  },

  count: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.primary,
    marginTop: 1,
  },

  selectedCount: {
    color: colors.onPrimaryMuted,
  },

  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  footer: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  footerButton: {
    flex: 1,
  },

  footerButtonWide: {
    flex: 2,
  },
});
