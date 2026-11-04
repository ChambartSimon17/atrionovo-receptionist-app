import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, Plus, Trash2 } from "lucide-react-native";

import { api } from "../../services/api";
import { useAuth } from "../../context/auth-context";
import {
  Button,
  ScreenHeader,
  SegmentedControl,
  Sheet,
  SkeletonList,
} from "../../components/ui";
import DateRangePicker from "../../components/ui/DateRangePicker";
import TimePicker, { formatMinutes } from "../../components/ui/TimePicker";
import { locale, plural, t } from "../../i18n";
import { colors, fonts, radius, spacing } from "../../theme";

// ======================================================
// Special opening days
// ======================================================
//
// Holidays, a vacation or a private party: days when the
// business is closed or open at other hours. The backend
// stores one special day per date; a range ("5–12 jan")
// is a run of days with the same name and hours, shown
// as one row and edited together.
//
// Upcoming days first, past days greyed out below.
// ======================================================

function todayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function addDays(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return date.toISOString().slice(0, 10);
}

function datesBetween(start, end) {
  const dates = [];

  for (let key = start; key <= end; key = addDays(key, 1)) {
    dates.push(key);
  }

  return dates;
}

function dateOf(key) {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day, 12);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function signature(day) {
  return JSON.stringify([
    day.name ?? "",
    day.isClosed,
    (day.openingPeriods ?? []).map((period) => [
      period.opensAtMinutes,
      period.closesAtMinutes,
    ]),
  ]);
}

/**
 * Consecutive days with the same name and hours become
 * one group { start, end, days, name, isClosed, periods }.
 */
function groupDays(specialDays) {
  const sorted = specialDays
    .map((day) => ({ ...day, key: String(day.date).slice(0, 10) }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const groups = [];

  sorted.forEach((day) => {
    const last = groups[groups.length - 1];

    if (
      last &&
      addDays(last.end, 1) === day.key &&
      signature(last.days[0]) === signature(day)
    ) {
      last.end = day.key;
      last.days.push(day);
      return;
    }

    groups.push({
      start: day.key,
      end: day.key,
      days: [day],
      name: day.name ?? "",
      isClosed: day.isClosed,
      periods: (day.openingPeriods ?? [])
        .map((period) => ({
          opens: period.opensAtMinutes,
          closes: period.closesAtMinutes,
        }))
        .sort((a, b) => a.opens - b.opens),
    });
  });

  return groups;
}

function DateTile({ group, past }) {
  const start = dateOf(group.start);
  const end = dateOf(group.end);
  const month = start
    .toLocaleDateString(locale, { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const days =
    group.start === group.end
      ? String(start.getDate())
      : `${start.getDate()}–${end.getDate()}`;

  const tone = past ? "past" : group.isClosed ? "closed" : "open";

  return (
    <View style={[styles.tile, styles[`tile_${tone}`]]}>
      <Text style={[styles.tileMonth, styles[`tileText_${tone}`]]}>{month}</Text>
      <Text
        style={[styles.tileDay, styles[`tileText_${tone}`]]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {days}
      </Text>
    </View>
  );
}

function groupDescription(group) {
  const length = group.days.length;

  if (group.isClosed) {
    return length > 1
      ? `${t("special.closed")} · ${plural("special.days", length)}`
      : t("special.closed");
  }

  return `${t("special.open")} ${group.periods
    .map((period) => `${formatMinutes(period.opens)} – ${formatMinutes(period.closes)}`)
    .join(", ")}`;
}

const EMPTY_FORM = {
  group: null,
  name: "",
  start: null,
  end: null,
  isClosed: true,
  periods: [{ opens: 18 * 60, closes: 23 * 60 }],
  editingPeriod: null,
};

export default function SpecialOpeningDaysScreen() {
  const { accessToken, business } = useAuth();

  const [specialDays, setSpecialDays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.getSpecialOpeningDays(business.id, accessToken);
      setSpecialDays(response?.data ?? response ?? []);
    } catch (error) {
      Alert.alert(t("common.error"), error?.message || t("special.loadFailed"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken, business?.id]);

  useEffect(() => {
    if (business?.id) {
      load();
    }
  }, [business?.id, load]);

  const today = todayKey();

  const { upcoming, past } = useMemo(() => {
    const groups = groupDays(specialDays);

    return {
      upcoming: groups.filter((group) => group.end >= today),
      past: groups.filter((group) => group.end < today).reverse().slice(0, 10),
    };
  }, [specialDays, today]);

  function openNew() {
    setForm({ ...EMPTY_FORM, start: today, end: today });
  }

  function openGroup(group) {
    setForm({
      ...EMPTY_FORM,
      group,
      name: group.name,
      start: group.start,
      end: group.end,
      isClosed: group.isClosed,
      periods: group.periods.length > 0 ? group.periods : EMPTY_FORM.periods,
    });
  }

  function update(changes) {
    setForm((current) => ({ ...current, ...changes }));
  }

  async function save() {
    const periods = [...form.periods].sort((a, b) => a.opens - b.opens);

    if (!form.isClosed) {
      const invalid = periods.some(
        (period, index) =>
          period.opens >= period.closes ||
          (index > 0 && period.opens < periods[index - 1].closes)
      );

      if (invalid || periods.length === 0) {
        Alert.alert(t("hours.invalid"), t("hours.overlap"));
        return;
      }
    }

    const dates = datesBetween(form.start, form.end);

    if (dates.length > 62) {
      Alert.alert(t("hours.invalid"), t("special.tooLong"));
      return;
    }

    const existingByDate = new Map(
      specialDays.map((day) => [String(day.date).slice(0, 10), day])
    );
    const ownIds = new Set(form.group?.days.map((day) => day.id) ?? []);

    const clash = dates.find((date) => {
      const day = existingByDate.get(date);
      return day && !ownIds.has(day.id);
    });

    if (clash) {
      Alert.alert(
        t("special.clashTitle"),
        t("special.clashMessage", {
          date: dateOf(clash).toLocaleDateString(locale, { day: "numeric", month: "long" }),
        })
      );
      return;
    }

    const payload = (date) => ({
      date,
      name: form.name.trim() || null,
      isClosed: form.isClosed,
      openingPeriods: form.isClosed
        ? []
        : periods.map((period) => ({
            opensAtMinutes: period.opens,
            closesAtMinutes: period.closes,
          })),
    });

    try {
      setIsSaving(true);

      const ownByDate = new Map(
        (form.group?.days ?? []).map((day) => [day.key, day])
      );

      // Days that left the range first, so a date can move.
      await Promise.all(
        [...ownByDate.values()]
          .filter((day) => !dates.includes(day.key))
          .map((day) => api.deleteSpecialOpeningDay(business.id, day.id, accessToken))
      );

      for (const date of dates) {
        const own = ownByDate.get(date);

        if (own) {
          await api.updateSpecialOpeningDay(business.id, own.id, payload(date), accessToken);
        } else {
          await api.createSpecialOpeningDay(business.id, payload(date), accessToken);
        }
      }

      setForm(null);
      await load();
    } catch (error) {
      Alert.alert(t("common.error"), error?.message || t("special.saveFailed"));
      load();
    } finally {
      setIsSaving(false);
    }
  }

  function remove() {
    const group = form.group;

    Alert.alert(t("special.removeTitle"), t("special.removeMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            setIsSaving(true);
            await Promise.all(
              group.days.map((day) =>
                api.deleteSpecialOpeningDay(business.id, day.id, accessToken)
              )
            );
            setForm(null);
            await load();
          } catch (error) {
            Alert.alert(t("common.error"), error?.message || t("special.saveFailed"));
          } finally {
            setIsSaving(false);
          }
        },
      },
    ]);
  }

  function renderGroup(group, index, isPast) {
    return (
      <Pressable
        key={group.start}
        accessibilityRole="button"
        onPress={() => openGroup(group)}
        style={({ pressed }) => [
          styles.row,
          index > 0 && styles.rowDivider,
          pressed && styles.rowPressed,
        ]}
      >
        <DateTile group={group} past={isPast} />
        <View style={styles.rowText}>
          <Text style={[styles.rowName, isPast && styles.muted]} numberOfLines={1}>
            {group.name || dateOf(group.start).toLocaleDateString(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
          {group.isClosed && !isPast ? (
            <View style={styles.closedBadge}>
              <Text style={styles.closedBadgeText}>{groupDescription(group)}</Text>
            </View>
          ) : (
            <Text style={styles.rowSub}>{groupDescription(group)}</Text>
          )}
        </View>
        <ChevronRight size={18} color={colors.textDisabled} strokeWidth={1.8} />
      </Pressable>
    );
  }

  const editingPeriod = form?.editingPeriod;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <ScreenHeader title={t("special.title")} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.description}>{t("special.description")}</Text>

        {isLoading ? (
          <SkeletonList rows={3} />
        ) : (
          <>
            <Text style={styles.groupLabel}>{t("special.upcoming")}</Text>
            {upcoming.length > 0 ? (
              <View style={styles.card}>
                {upcoming.map((group, index) => renderGroup(group, index, false))}
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{t("special.emptyTitle")}</Text>
                <Text style={styles.emptyText}>{t("special.emptyText")}</Text>
              </View>
            )}

            {past.length > 0 ? (
              <>
                <Text style={styles.groupLabel}>{t("special.past")}</Text>
                <View style={styles.card}>
                  {past.map((group, index) => renderGroup(group, index, true))}
                </View>
              </>
            ) : null}
          </>
        )}

        <Button
          variant="primary"
          label={t("special.add")}
          icon={<Plus size={18} color={colors.onPrimary} strokeWidth={2} />}
          onPress={openNew}
          style={styles.add}
        />
      </ScrollView>

      <Sheet
        visible={form !== null}
        onClose={() => (editingPeriod ? update({ editingPeriod: null }) : setForm(null))}
        title={
          editingPeriod
            ? t("special.periodTitle")
            : form?.group
              ? t("special.edit")
              : t("special.add")
        }
        footer={
          form ? (
            editingPeriod ? (
              <Button
                variant="primary"
                label={t("common.done")}
                onPress={() => {
                  const periods = [...form.periods];
                  periods[editingPeriod.index] = {
                    opens: editingPeriod.opens,
                    closes: editingPeriod.closes,
                  };
                  update({ periods, editingPeriod: null });
                }}
              />
            ) : (
              <>
                <Button
                  variant="primary"
                  label={t("common.save")}
                  onPress={save}
                  loading={isSaving}
                />
                {form.group ? (
                  <Button
                    variant="danger"
                    label={t("common.delete")}
                    icon={<Trash2 size={16} color={colors.danger} strokeWidth={2} />}
                    onPress={remove}
                    disabled={isSaving}
                  />
                ) : null}
              </>
            )
          ) : null
        }
      >
        {form && editingPeriod ? (
          <View>
            <Text style={styles.label}>{t("hours.opens")}</Text>
            <TimePicker
              value={editingPeriod.opens}
              onChange={(opens) => update({ editingPeriod: { ...editingPeriod, opens } })}
            />
            <Text style={[styles.label, styles.labelGap]}>{t("hours.closes")}</Text>
            <TimePicker
              value={editingPeriod.closes}
              onChange={(closes) => update({ editingPeriod: { ...editingPeriod, closes } })}
            />
          </View>
        ) : form ? (
          <View>
            <Text style={styles.label}>{t("special.name")}</Text>
            <TextInput
              value={form.name}
              onChangeText={(name) => update({ name })}
              placeholder={t("special.namePlaceholder")}
              placeholderTextColor={colors.textDisabled}
              style={styles.input}
              maxLength={60}
            />

            <Text style={[styles.label, styles.labelGap, styles.noCaps]}>
              {form.start === form.end
                ? capitalize(
                    dateOf(form.start).toLocaleDateString(locale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  )
                : `${dateOf(form.start).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                  })} – ${dateOf(form.end).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                  })} · ${plural("special.days", datesBetween(form.start, form.end).length)}`}
            </Text>
            <View style={styles.calendar}>
              <DateRangePicker
                start={form.start}
                end={form.end}
                minDate={form.group ? undefined : today}
                onChange={({ start, end }) => update({ start, end })}
              />
            </View>
            <Text style={styles.hint}>{t("special.rangeHint")}</Text>

            <View style={styles.labelGap}>
              <SegmentedControl
                options={[
                  { value: "closed", label: t("special.closed") },
                  { value: "open", label: t("special.otherHours") },
                ]}
                value={form.isClosed ? "closed" : "open"}
                onChange={(value) => update({ isClosed: value === "closed" })}
              />
            </View>

            {!form.isClosed ? (
              <View style={styles.periods}>
                {form.periods.map((period, index) => (
                  <Pressable
                    key={index}
                    accessibilityRole="button"
                    onPress={() => update({ editingPeriod: { index, ...period } })}
                    onLongPress={() =>
                      form.periods.length > 1 &&
                      update({
                        periods: form.periods.filter((_, other) => other !== index),
                      })
                    }
                    style={styles.pill}
                  >
                    <Text style={styles.pillText}>
                      {formatMinutes(period.opens)} – {formatMinutes(period.closes)}
                    </Text>
                  </Pressable>
                ))}
                {form.periods.length < 3 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const last = form.periods[form.periods.length - 1];
                      const opens = Math.min((last?.closes ?? 11 * 60) + 60, 22 * 60);
                      update({
                        editingPeriod: {
                          index: form.periods.length,
                          opens,
                          closes: Math.min(opens + 3 * 60, 23 * 60 + 45),
                        },
                      });
                    }}
                    style={styles.addPill}
                  >
                    <Plus size={13} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.addPillText}>{t("hours.period")}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },

  description: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginHorizontal: spacing.xs,
  },

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

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  rowText: {
    flex: 1,
    alignItems: "flex-start",
    gap: 4,
  },

  rowName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    textTransform: "capitalize",
  },

  rowSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },

  muted: {
    color: colors.textMuted,
  },

  closedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft,
  },

  closedBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.danger,
  },

  tile: {
    width: 46,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: radius.md,
    alignItems: "center",
  },

  tile_open: { backgroundColor: colors.sandSoft },
  tile_closed: { backgroundColor: colors.dangerSoft },
  tile_past: { backgroundColor: colors.surfaceMuted },

  tileText_open: { color: colors.onSand },
  tileText_closed: { color: colors.danger },
  tileText_past: { color: colors.textMuted },

  tileMonth: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.4,
  },

  tileDay: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },

  empty: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
  },

  emptyTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },

  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  add: {
    marginTop: spacing.xxl,
  },

  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: "capitalize",
  },

  labelGap: {
    marginTop: spacing.lg,
  },

  noCaps: {
    textTransform: "none",
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

  calendar: {
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  periods: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },

  pillText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },

  addPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primaryBorder,
  },

  addPillText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },
});
