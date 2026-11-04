import { Children, Fragment } from "react";
import {
  Pressable,
  StyleSheet,
  Switch as NativeSwitch,
  Text,
  View,
} from "react-native";
import { ChevronRight, Minus, Plus } from "lucide-react-native";

import { colors, fonts, radius, spacing } from "../../theme";

// ======================================================
// Settings building blocks
// ======================================================
//
// SettingsGroup   a small caps label above a white card
//                 whose rows are divided by a hairline
// SettingsRow     label left, value or control right;
//                 with onPress it shows a chevron
// Switch          the app's green switch
// Stepper         − value + for small numbers
// ======================================================

export function SettingsGroup({ label, footer, children, style }) {
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={style}>
      {label ? <Text style={styles.groupLabel}>{label}</Text> : null}
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

export function SettingsRow({ label, value, children, onPress, danger, hint }) {
  const content = (
    <>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.danger]}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {value !== undefined ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {children}
      {onPress ? (
        <ChevronRight size={18} color={colors.textDisabled} strokeWidth={1.8} />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

export function Switch({ value, onValueChange, disabled }) {
  return (
    <NativeSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={colors.border}
    />
  );
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, suffix }) {
  const change = (delta) => {
    const next = Math.min(max, Math.max(min, (Number(value) || 0) + delta));

    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="−"
        onPress={() => change(-step)}
        disabled={value <= min}
        style={({ pressed }) => [
          styles.stepButton,
          pressed && styles.rowPressed,
          value <= min && styles.stepDisabled,
        ]}
      >
        <Minus size={16} color={colors.text} strokeWidth={2} />
      </Pressable>
      <Text style={styles.stepValue}>
        {value}
        {suffix ? ` ${suffix}` : ""}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="+"
        onPress={() => change(step)}
        disabled={value >= max}
        style={({ pressed }) => [
          styles.stepButton,
          pressed && styles.rowPressed,
          value >= max && styles.stepDisabled,
        ]}
      >
        <Plus size={16} color={colors.text} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.xs,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: spacing.lg,
  },

  footer: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginHorizontal: spacing.xs,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  rowText: {
    flex: 1,
  },

  rowLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },

  rowHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  rowValue: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },

  danger: {
    color: colors.danger,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  stepButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  stepDisabled: {
    opacity: 0.4,
  },

  stepValue: {
    minWidth: 28,
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
});
