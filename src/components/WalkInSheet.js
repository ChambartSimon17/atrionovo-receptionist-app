import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Button, SegmentedControl, Sheet, Stepper } from "./ui";
import { plural, t } from "../i18n";
import { colors, fonts, radius, spacing } from "../theme";
import { formatTime } from "../utils/date";
import { freeTablesForWalkIn } from "./walk-in";

export { freeTablesForWalkIn };

// ======================================================
// WalkInSheet
// ======================================================
//
// "Walk-in voor 2": guests without a booking, seated
// right away. Pick the number of guests and how long
// they stay; the tables that are free for that long and
// big enough are suggested, smallest first. A table can
// be passed in (from the floor plan) to skip the choice.
// ======================================================

const DURATIONS = [60, 90, 120];

export default function WalkInSheet({
  visible,
  onClose,
  tables,
  reservations,
  table: fixedTable,
  onConfirm,
}) {
  const [guestCount, setGuestCount] = useState(2);
  const [minutes, setMinutes] = useState(90);
  const [name, setName] = useState("");
  const [tableId, setTableId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setGuestCount(fixedTable ? Math.min(2, fixedTable.capacity) : 2);
      setMinutes(90);
      setName("");
      setTableId(fixedTable?.id ?? null);
    }
  }, [visible, fixedTable]);

  const options = useMemo(
    () => freeTablesForWalkIn(tables, reservations, guestCount, minutes),
    [tables, reservations, guestCount, minutes]
  );

  useEffect(() => {
    if (!fixedTable && visible && !options.some((option) => option.table.id === tableId)) {
      setTableId(options[0]?.table.id ?? null);
    }
  }, [options, fixedTable, visible, tableId]);

  const fixedFree = fixedTable
    ? options.some((option) => option.table.id === fixedTable.id)
    : true;

  async function confirm() {
    if (!tableId) {
      return;
    }

    setIsSaving(true);
    const ok = await onConfirm({
      guestCount,
      durationMinutes: minutes,
      tableIds: [tableId],
      name: name.trim() || undefined,
    });
    setIsSaving(false);

    if (ok) {
      onClose();
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={
        fixedTable
          ? t("walkIn.titleAt", { table: fixedTable.name })
          : t("walkIn.title")
      }
      footer={
        <Button
          variant="primary"
          label={plural("walkIn.confirm", guestCount)}
          onPress={confirm}
          loading={isSaving}
          disabled={!tableId || !fixedFree}
        />
      }
    >
      <View style={styles.row}>
        <Text style={styles.label}>{t("walkIn.guests")}</Text>
        <Stepper
          value={guestCount}
          onChange={setGuestCount}
          min={1}
          max={fixedTable?.capacity ?? 20}
        />
      </View>

      <Text style={[styles.label, styles.gap]}>{t("walkIn.duration")}</Text>
      <SegmentedControl
        options={DURATIONS.map((value) => ({ value, label: `${value} min` }))}
        value={minutes}
        onChange={setMinutes}
      />

      {!fixedTable ? (
        <>
          <Text style={[styles.label, styles.gap]}>{t("walkIn.table")}</Text>
          {options.length === 0 ? (
            <Text style={styles.empty}>{t("walkIn.noTable")}</Text>
          ) : (
            <View style={styles.tables}>
              {options.slice(0, 12).map(({ table, next }) => {
                const active = table.id === tableId;

                return (
                  <Pressable
                    key={table.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setTableId(table.id)}
                    style={[styles.table, active && styles.tableActive]}
                  >
                    <Text style={[styles.tableName, active && styles.tableTextActive]}>
                      {table.name}
                    </Text>
                    <Text style={[styles.tableMeta, active && styles.tableTextActive]}>
                      {next
                        ? t("walkIn.until", { time: formatTime(next.startTime) })
                        : t("floor.seatsShort", { count: table.capacity })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      ) : !fixedFree ? (
        <Text style={[styles.empty, styles.gap]}>{t("walkIn.tableTaken")}</Text>
      ) : null}

      <Text style={[styles.label, styles.gap]}>{t("walkIn.name")}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("walkIn.namePlaceholder")}
        placeholderTextColor={colors.textDisabled}
        style={styles.input}
        maxLength={40}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  gap: {
    marginTop: spacing.lg,
  },

  tables: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  table: {
    minWidth: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },

  tableActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  tableName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },

  tableMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },

  tableTextActive: {
    color: colors.onPrimary,
  },

  empty: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.danger,
  },

  input: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
});
