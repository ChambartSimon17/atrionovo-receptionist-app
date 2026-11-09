import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SegmentedControl } from "../../../components/ui";
import ScheduleView from "../../../components/team/ScheduleView";
import AttendanceView from "../../../components/team/AttendanceView";
import useWideLayout from "../../../hooks/useWideLayout";
import { t } from "../../../i18n";
import { colors, spacing, type } from "../../../theme";

// ======================================================
// Team (salon)
// ======================================================
//
// Rooster: the week of every therapist, other hours on a
// date, absences (only the owner reports them).
// Aanwezigheid: the time clock, compared with the
// schedule.
//
// On a tablet in landscape the week uses the full width.
// ======================================================

export default function TeamScreen() {
  const [view, setView] = useState("schedule");
  const wide = useWideLayout();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[styles.content, wide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={type.title}>{t("team.title")}</Text>
        </View>

        <SegmentedControl
          options={[
            { value: "schedule", label: t("team.schedule") },
            { value: "attendance", label: t("team.attendance") },
          ]}
          value={view}
          onChange={setView}
        />

        {view === "schedule" ? <ScheduleView /> : <AttendanceView />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 48,
    gap: spacing.lg,
  },

  contentWide: {
    maxWidth: 1100,
    paddingHorizontal: spacing.xl,
  },

  header: {
    gap: spacing.xs,
  },
});
