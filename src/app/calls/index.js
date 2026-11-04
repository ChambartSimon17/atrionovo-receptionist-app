import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import { Chip, ScreenHeader, SkeletonList } from "../../components/ui";
import { locale, t } from "../../i18n";
import { colors, fonts, radius, spacing } from "../../theme";
import { OUTCOMES, OUTCOME_TONES, formatDuration } from "../../components/call-outcomes";
import { formatTime } from "../../utils/date";

// ======================================================
// Gesprekken
// ======================================================
//
// Every call the AI receptionist answered, newest first,
// grouped per day: who called, what the AI did (booked,
// changed, only a question, or could not help) and a
// one-line summary. Callers still to call back come
// first in their own filter. Tap a call for the summary,
// the transcript and the recording.
// ======================================================

const FILTERS = ["ALL", "NEEDS_CALLBACK", "BOOKED", "CHANGED", "INFORMATION"];

function dayTitle(date) {
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);

  if (date.toDateString() === today.toDateString()) {
    return t("calls.today");
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return t("calls.yesterday");
  }

  return date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
}

export default function CallsScreen() {
  const router = useRouter();
  const { business, accessToken } = useAuth();

  const [calls, setCalls] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!business?.id) {
      return;
    }

    try {
      const response = await api.getCalls(
        business.id,
        {
          from: new Date(Date.now() - 60 * 86400000).toISOString(),
          to: new Date(Date.now() + 60000).toISOString(),
          limit: 300,
        },
        accessToken
      );
      setCalls(response?.data ?? response ?? []);
      setError(null);
    } catch (loadError) {
      setError(loadError?.message || t("calls.loadFailed"));
      setCalls((current) => current ?? []);
    } finally {
      setIsRefreshing(false);
    }
  }, [accessToken, business?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const counts = useMemo(() => {
    const result = Object.fromEntries(FILTERS.map((key) => [key, 0]));

    (calls ?? []).forEach((call) => {
      result.ALL += 1;
      if (call.outcome === "NEEDS_CALLBACK") {
        if (!call.handledAt) {
          result.NEEDS_CALLBACK += 1;
        }
      } else {
        result[call.outcome] += 1;
      }
    });

    return result;
  }, [calls]);

  const sections = useMemo(() => {
    const visible = (calls ?? []).filter((call) =>
      filter === "ALL"
        ? true
        : filter === "NEEDS_CALLBACK"
          ? call.outcome === "NEEDS_CALLBACK" && !call.handledAt
          : call.outcome === filter
    );

    const groups = new Map();

    visible.forEach((call) => {
      const date = new Date(call.startedAt);
      const key = date.toDateString();

      if (!groups.has(key)) {
        groups.set(key, { title: dayTitle(date), data: [] });
      }

      groups.get(key).data.push(call);
    });

    return [...groups.values()];
  }, [calls, filter]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <ScreenHeader title={t("calls.title")} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((item) => (
          <Chip
            key={item}
            label={`${t(`calls.filter.${item}`)}${counts[item] ? ` (${counts[item]})` : ""}`}
            selected={filter === item}
            onPress={() => setFilter(item)}
          />
        ))}
      </ScrollView>

      {calls === null ? (
        <View style={styles.content}>
          <SkeletonList rows={6} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          stickySectionHeadersEnabled={false}
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {error ? t("common.error") : t(`calls.empty.${filter}`)}
              </Text>
              <Text style={styles.emptyText}>{error ?? t("calls.emptyText")}</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          renderItem={({ item, index, section }) => {
            const outcome = OUTCOMES[item.outcome] ?? OUTCOMES.INFORMATION;
            const tone =
              item.outcome === "NEEDS_CALLBACK" && item.handledAt
                ? OUTCOME_TONES.muted
                : OUTCOME_TONES[outcome.tone];
            const Icon = outcome.icon;
            const first = index === 0;
            const last = index === section.data.length - 1;

            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/calls/${item.id}`)}
                style={({ pressed }) => [
                  styles.row,
                  first && styles.rowFirst,
                  last && styles.rowLast,
                  !first && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={[styles.icon, { backgroundColor: tone.background }]}>
                  <Icon size={18} color={tone.color} strokeWidth={1.8} />
                </View>
                <View style={styles.rowText}>
                  <View style={styles.rowTop}>
                    <Text style={styles.caller} numberOfLines={1}>
                      {item.callerName || item.callerNumber || t("calls.unknown")}
                    </Text>
                    <Text style={styles.time}>{formatTime(item.startedAt)}</Text>
                  </View>
                  <Text style={[styles.outcome, { color: tone.color }]}>
                    {item.outcome === "NEEDS_CALLBACK" && item.handledAt
                      ? t("calls.handled")
                      : t(`calls.outcome.${item.outcome}`)}
                    {" · "}
                    <Text style={styles.duration}>{formatDuration(item.durationSeconds)}</Text>
                  </Text>
                  {item.summary ? (
                    <Text style={styles.summary} numberOfLines={2}>
                      {item.summary}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: spacing.xl,
  },

  filtersScroll: {
    flexGrow: 0,
  },

  filters: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },

  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.xs,
  },

  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },

  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },

  rowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },

  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  rowText: {
    flex: 1,
    gap: 2,
  },

  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  caller: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },

  time: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },

  outcome: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
  },

  duration: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },

  summary: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 2,
  },

  empty: {
    marginTop: spacing.xxl,
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
    textAlign: "center",
  },

  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
});
