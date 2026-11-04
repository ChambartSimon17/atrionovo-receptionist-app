import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, spacing } from "../../theme";

// ======================================================
// TimePicker
// ======================================================
//
// Two columns, hours and minutes, for picking a time on a
// quarter of an hour. value and onChange use minutes
// after midnight (1110 = 18:30). Used inside a Sheet.
// ======================================================

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = [0, 15, 30, 45];
const ROW = 44;

function pad(number) {
  return String(number).padStart(2, "0");
}

export function formatMinutes(minutes) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function Column({ items, selected, onSelect, format }) {
  const ref = useRef(null);

  useEffect(() => {
    const index = Math.max(0, items.indexOf(selected));
    ref.current?.scrollTo({ y: Math.max(0, index - 2) * ROW, animated: false });
  }, []);

  return (
    <ScrollView
      ref={ref}
      style={styles.column}
      showsVerticalScrollIndicator={false}
    >
      {items.map((item) => {
        const active = item === selected;

        return (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(item)}
            style={[styles.item, active && styles.itemActive]}
          >
            <Text style={[styles.itemText, active && styles.itemTextActive]}>
              {format(item)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function TimePicker({ value, onChange }) {
  const hour = Math.floor(value / 60);
  const minute = MINUTES.includes(value % 60) ? value % 60 : 0;

  return (
    <View style={styles.picker}>
      <Column
        items={HOURS}
        selected={hour}
        onSelect={(next) => onChange(next * 60 + minute)}
        format={pad}
      />
      <Text style={styles.colon}>:</Text>
      <Column
        items={MINUTES}
        selected={minute}
        onSelect={(next) => onChange(hour * 60 + next)}
        format={pad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    height: ROW * 5,
  },

  column: {
    flex: 1,
    height: ROW * 5,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  colon: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    color: colors.textMuted,
  },

  item: {
    height: ROW,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.xs,
    borderRadius: radius.md,
  },

  itemActive: {
    backgroundColor: colors.primary,
  },

  itemText: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.text,
  },

  itemTextActive: {
    color: colors.onPrimary,
    fontFamily: fonts.semibold,
  },
});
