import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { CircleCheck, Phone, Play, RotateCcw } from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import { Button, Card, ScreenHeader, Skeleton } from "../../components/ui";
import { locale, t } from "../../i18n";
import { colors, fonts, radius, spacing } from "../../theme";
import { formatTime } from "../../utils/date";
import { OUTCOMES, OUTCOME_TONES, formatDuration } from "../../components/call-outcomes";

// ======================================================
// One call
// ======================================================
//
// The caller, what the AI did, when and how long, the
// summary, the recording and the transcript. A caller
// the AI could not help can be called back from here and
// then marked as handled.
// ======================================================

function transcriptLines(transcript) {
  return String(transcript)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(AI|Assistant|Bot|User|Customer|Klant|Beller)\s*:\s*(.*)$/i.exec(line);

      if (!match) {
        return { speaker: null, text: line };
      }

      return {
        speaker: /^(ai|assistant|bot)$/i.test(match[1]) ? "ai" : "caller",
        text: match[2],
      };
    });
}

export default function CallScreen() {
  const { id } = useLocalSearchParams();
  const { business, accessToken } = useAuth();

  const [call, setCall] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!business?.id || !id) {
        return;
      }

      api
        .getCall(business.id, id, accessToken)
        .then((response) => setCall(response?.data ?? response))
        .catch((error) => Alert.alert(t("common.error"), error?.message || t("calls.loadFailed")));
    }, [accessToken, business?.id, id])
  );

  async function toggleHandled() {
    try {
      setIsUpdating(true);
      const response = await api.setCallHandled(business.id, call.id, !call.handledAt, accessToken);
      setCall(response?.data ?? response);
    } catch (error) {
      Alert.alert(t("common.error"), error?.message || t("common.tryAgain"));
    } finally {
      setIsUpdating(false);
    }
  }

  const outcome = call ? OUTCOMES[call.outcome] ?? OUTCOMES.INFORMATION : null;
  const tone = outcome ? OUTCOME_TONES[outcome.tone] : null;
  const Icon = outcome?.icon;
  const lines = call?.transcript ? transcriptLines(call.transcript) : [];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <ScreenHeader title={t("calls.callTitle")} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!call ? (
          <View style={styles.loading}>
            <Skeleton width="60%" height={24} />
            <Skeleton width="40%" height={14} />
            <Skeleton height={90} />
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <View style={[styles.heroIcon, { backgroundColor: tone.background }]}>
                <Icon size={22} color={tone.color} strokeWidth={1.8} />
              </View>
              <Text style={styles.caller}>
                {call.callerName || call.callerNumber || t("calls.unknown")}
              </Text>
              {call.callerName && call.callerNumber ? (
                <Text style={styles.number}>{call.callerNumber}</Text>
              ) : null}
              <Text style={[styles.outcome, { color: tone.color }]}>
                {call.outcome === "NEEDS_CALLBACK" && call.handledAt
                  ? t("calls.handled")
                  : t(`calls.outcome.${call.outcome}`)}
              </Text>
              <Text style={styles.meta}>
                {new Date(call.startedAt).toLocaleDateString(locale, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}{" "}
                · {formatTime(call.startedAt)} · {formatDuration(call.durationSeconds)}
              </Text>
            </View>

            <View style={styles.actions}>
              {call.callerNumber ? (
                <Button
                  variant={call.outcome === "NEEDS_CALLBACK" && !call.handledAt ? "primary" : "secondary"}
                  label={t("calls.callBack")}
                  icon={
                    <Phone
                      size={17}
                      color={
                        call.outcome === "NEEDS_CALLBACK" && !call.handledAt
                          ? colors.onPrimary
                          : colors.text
                      }
                      strokeWidth={1.8}
                    />
                  }
                  onPress={() => Linking.openURL(`tel:${call.callerNumber}`)}
                  style={styles.flex}
                />
              ) : null}
              {call.outcome === "NEEDS_CALLBACK" ? (
                <Button
                  label={call.handledAt ? t("calls.reopen") : t("calls.markHandled")}
                  icon={
                    call.handledAt ? (
                      <RotateCcw size={17} color={colors.text} strokeWidth={1.8} />
                    ) : (
                      <CircleCheck size={17} color={colors.text} strokeWidth={1.8} />
                    )
                  }
                  onPress={toggleHandled}
                  loading={isUpdating}
                  style={styles.flex}
                />
              ) : null}
            </View>

            {call.summary ? (
              <Card style={styles.card}>
                <Text style={styles.cardLabel}>{t("calls.summary")}</Text>
                <Text style={styles.summary}>{call.summary}</Text>
              </Card>
            ) : null}

            {call.recordingUrl ? (
              <Button
                label={t("calls.listen")}
                icon={<Play size={17} color={colors.text} strokeWidth={1.8} />}
                onPress={() => WebBrowser.openBrowserAsync(call.recordingUrl)}
                style={styles.listen}
              />
            ) : null}

            {lines.length > 0 ? (
              <View style={styles.transcript}>
                <Text style={styles.cardLabel}>{t("calls.transcript")}</Text>
                {lines.map((line, index) => (
                  <View
                    key={index}
                    style={[
                      styles.bubble,
                      line.speaker === "ai" ? styles.bubbleAi : styles.bubbleCaller,
                    ]}
                  >
                    {line.speaker ? (
                      <Text
                        style={[
                          styles.speaker,
                          line.speaker === "ai" && styles.speakerAi,
                        ]}
                      >
                        {line.speaker === "ai" ? t("calls.ai") : t("calls.caller")}
                      </Text>
                    ) : null}
                    <Text
                      style={[styles.bubbleText, line.speaker === "ai" && styles.bubbleTextAi]}
                    >
                      {line.text}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: spacing.xl,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },

  loading: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },

  hero: {
    alignItems: "center",
    marginTop: spacing.lg,
  },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },

  caller: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: colors.text,
    textAlign: "center",
  },

  number: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },

  outcome: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    marginTop: spacing.sm,
  },

  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },

  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },

  card: {
    marginTop: spacing.lg,
  },

  cardLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },

  summary: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },

  listen: {
    marginTop: spacing.md,
  },

  transcript: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },

  bubble: {
    maxWidth: "86%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },

  bubbleAi: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderTopLeftRadius: 4,
  },

  bubbleCaller: {
    alignSelf: "flex-end",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopRightRadius: 4,
  },

  speaker: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    color: colors.textMuted,
    marginBottom: 2,
  },

  speakerAi: {
    color: colors.primary,
  },

  bubbleText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },

  bubbleTextAi: {
    color: colors.text,
  },
});
