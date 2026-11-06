import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";

import { Button, Sheet } from "../ui";
import TimeRangeField from "./TimeRangeField";
import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import { locale, t } from "../../i18n";
import { colors, fonts, radius, spacing, type } from "../../theme";
import { formatClock, fromKey } from "./team-format";

// ======================================================
// EntrySheet
// ======================================================
//
// The owner corrects the time clock of one therapist on
// one day: change a time, add a forgotten shift, set the
// clock-out that was forgotten, or delete an entry.
// Changes are marked "aangepast".
//
// row: one therapist of the attendance list.
// ======================================================

function toMinutes(iso) {
  const date = new Date(iso);

  return date.getHours() * 60 + date.getMinutes();
}

function atMinutes(date, minutes) {
  const value = fromKey(date);

  value.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return value.toISOString();
}

export default function EntrySheet({ visible, date, row, onClose, onChanged }) {
  const { business, accessToken } = useAuth();

  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setEditing(null);
    }
  }, [visible]);

  if (!row) {
    return null;
  }

  function startEdit(entry) {
    const start = entry ? toMinutes(entry.clockInAt) : row.periods[0]?.startMinutes ?? 600;
    const end = entry?.clockOutAt
      ? toMinutes(entry.clockOutAt)
      : Math.min(start + 8 * 60, 1425);

    setEditing({ entry, value: { startMinutes: start, endMinutes: end } });
  }

  async function save() {
    const { entry, value } = editing;

    if (value.endMinutes <= value.startMinutes) {
      Alert.alert(t("team.endAfterStart"));
      return;
    }

    setSaving(true);

    try {
      const times = {
        clockInAt: atMinutes(date, value.startMinutes),
        clockOutAt: atMinutes(date, value.endMinutes),
      };

      if (entry) {
        await api.updateTimeEntry(business.id, entry.id, times, accessToken);
      } else {
        await api.addTimeEntry(business.id, { therapistId: row.id, ...times }, accessToken);
      }

      setEditing(null);
      onChanged();
    } catch (error) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setSaving(false);
    }
  }

  function remove(entry) {
    Alert.alert(t("attendance.deleteEntry"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteTimeEntry(business.id, entry.id, accessToken);
            onChanged();
          } catch (error) {
            Alert.alert(t("common.error"), error.message);
          }
        },
      },
    ]);
  }

  const title = `${row.name} · ${fromKey(date).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  })}`;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        editing ? (
          <>
            <Button label={t("common.save")} variant="primary" loading={saving} onPress={save} />
            <Button label={t("common.cancel")} variant="ghost" onPress={() => setEditing(null)} />
          </>
        ) : (
          <Button label={t("attendance.addEntry")} variant="primary" onPress={() => startEdit(null)} />
        )
      }
    >
      {editing ? (
        <View style={styles.body}>
          <TimeRangeField
            value={editing.value}
            onChange={(value) => setEditing({ ...editing, value })}
            fromLabel={t("attendance.clockIn")}
            toLabel={t("attendance.clockOut")}
          />
          <Text style={type.caption}>{t("team.pinHint")}</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.label}>{t("attendance.entries")}</Text>

          {row.entries.length === 0 ? (
            <Text style={type.caption}>{t("attendance.noEntries")}</Text>
          ) : (
            row.entries.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => startEdit(entry)}
                  style={styles.entryMain}
                >
                  <Text style={type.bodyMedium}>
                    {formatClock(entry.clockInAt)} –{" "}
                    {entry.clockOutAt ? formatClock(entry.clockOutAt) : t("attendance.stillIn")}
                  </Text>
                  <Text style={type.caption}>
                    {entry.clockOutAt ? "" : `${t("attendance.setOut")} · `}
                    {entry.editedByOwner ? t("attendance.edited") : ""}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("attendance.deleteEntry")}
                  onPress={() => remove(entry)}
                  hitSlop={8}
                  style={styles.delete}
                >
                  <Trash2 size={18} color={colors.danger} strokeWidth={1.8} />
                </Pressable>
              </View>
            ))
          )}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },

  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
  },

  entry: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },

  entryMain: {
    flex: 1,
    padding: spacing.md,
    gap: 2,
  },

  delete: {
    padding: spacing.md,
  },
});
