import { useRef } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react-native";

import { locale, t } from "../i18n";
import { colors, fonts, radius, spacing } from "../theme";
import { addDays, todayString } from "../utils/date";

// ======================================================
// WeekStrip
// ======================================================
//
// The seven days of the week of `date`. Tap a day to
// open it, swipe sideways (or use the arrows) for the
// week before or after. The month above opens the
// calendar (onOpenCalendar); "Vandaag" jumps back.
//
// counts: { "2026-11-06": 7 } shows a dot under days
// with bookings.
// ======================================================

function fromKey(key) {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day, 12);
}

/**
 * Monday of the week of a "YYYY-MM-DD" day.
 */
export function weekStart(date) {
  const offset = (fromKey(date).getDay() + 6) % 7;

  return addDays(date, -offset);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function WeekStrip({ date, onChange, counts = {}, onOpenCalendar }) {
  const today = todayString();
  const monday = weekStart(date);
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));

  // Keep the latest values for the swipe handler, which
  // is created once.
  const latest = useRef({ date, onChange });
  latest.current = { date, onChange };

  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > 50) {
          const { date: current, onChange: change } = latest.current;

          change(addDays(current, gesture.dx < 0 ? 7 : -7));
        }
      },
    })
  ).current;

  const month = capitalize(
    fromKey(date).toLocaleDateString(locale, { month: "long", year: "numeric" })
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("calendar.open")}
          onPress={onOpenCalendar}
          disabled={!onOpenCalendar}
          hitSlop={8}
          style={styles.month}
        >
          <Text style={styles.monthText}>{month}</Text>
          {onOpenCalendar ? (
            <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
          ) : null}
        </Pressable>

        <View style={styles.headerActions}>
          {date !== today ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onChange(today)}
              hitSlop={6}
              style={styles.todayButton}
            >
              <Text style={styles.todayText}>{t("calendar.today")}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("calendar.previousWeek")}
            onPress={() => onChange(addDays(date, -7))}
            hitSlop={6}
            style={styles.arrow}
          >
            <ChevronLeft size={18} color={colors.text} strokeWidth={1.8} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("calendar.nextWeek")}
            onPress={() => onChange(addDays(date, 7))}
            hitSlop={6}
            style={styles.arrow}
          >
            <ChevronRight size={18} color={colors.text} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>

      <View style={styles.days} {...swipe.panHandlers}>
        {days.map((day) => {
          const selected = day === date;
          const value = fromKey(day);

          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={value.toLocaleDateString(locale, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              onPress={() => onChange(day)}
              style={[styles.day, selected && styles.daySelected]}
            >
              <Text style={[styles.weekday, selected && styles.weekdaySelected]}>
                {value
                  .toLocaleDateString(locale, { weekday: "short" })
                  .replace(".", "")
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.number,
                  day === today && !selected && styles.numberToday,
                  selected && styles.numberSelected,
                ]}
              >
                {value.getDate()}
              </Text>
              <View
                style={[
                  styles.dot,
                  !counts[day] && styles.dotHidden,
                  selected && styles.dotSelected,
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  month: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  monthText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  todayButton: {
    paddingHorizontal: spacing.md,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    marginRight: spacing.xs,
  },

  todayText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },

  arrow: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  days: {
    flexDirection: "row",
    gap: 4,
  },

  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    gap: 2,
  },

  daySelected: {
    backgroundColor: colors.primary,
  },

  weekday: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },

  weekdaySelected: {
    color: colors.onPrimaryMuted,
  },

  number: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  numberToday: {
    color: colors.primary,
  },

  numberSelected: {
    color: colors.onPrimary,
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primaryBorder,
    marginTop: 2,
  },

  dotHidden: {
    opacity: 0,
  },

  dotSelected: {
    backgroundColor: colors.onPrimaryMuted,
  },
});
