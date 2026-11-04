import {
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  Armchair,
  ChevronLeft,
  DoorOpen,
  Pencil,
  Phone,
  StickyNote,
  X,
} from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import { guestLabel } from "../../components/ReservationRow";
import {
  Badge,
  Button,
  Card,
} from "../../components/ui";
import { tableNames } from "../../hooks/useRestaurantDay";
import {
  colors,
  fonts,
  radius,
  spacing,
  touchTarget,
  type,
} from "../../theme";
import {
  formatTime,
  toDateString,
} from "../../utils/date";

// ======================================================
// Reservatie
// ======================================================
//
// One reservation: who, when, how many, which tables and
// the note, with the steps that fit its status:
//
//   CONFIRMED  Aan tafel · Bewerken · Annuleren
//   SEATED     Vertrokken
//
// and a button to call the guest.
// ======================================================

const STATUS = {
  CONFIRMED: { label: "Bevestigd", status: "CONFIRMED" },
  SEATED: { label: "Aan tafel", status: "SEATED" },
  COMPLETED: { label: "Afgerond", status: "COMPLETED" },
  CANCELLED: { label: "Geannuleerd", status: "CANCELLED" },
  NO_SHOW: { label: "Niet verschenen", status: "NO_SHOW" },
};

function formatLongDate(isoString) {
  return new Date(isoString).toLocaleDateString("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function ReservationDetailsScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams();

  const { business, accessToken } = useAuth();

  const [reservation, setReservation] = useState(null);
  const [tables, setTables] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken || !id) {
        return;
      }

      api
        .getReservation(id, accessToken)
        .then((response) => {
          const data = response?.data || response;

          setReservation(data);
          setError(null);

          // The single reservation does not include its
          // tables; the day list does.
          return api
            .getReservationsForDay(
              toDateString(new Date(data.startTime)),
              accessToken
            )
            .then((dayResponse) =>
              setAssigned(
                (dayResponse?.data || []).find(
                  (item) => item.id === data.id
                )?.tables ?? []
              )
            )
            .catch(() => setAssigned([]));
        })
        .catch((loadError) =>
          setError(
            loadError?.message ||
              "Reservatie kon niet worden geladen."
          )
        )
        .finally(() => setIsLoading(false));

      // Table names come from the table list.
      if (business?.id) {
        api
          .getTables(business.id, accessToken)
          .then((response) =>
            setTables(response?.data || response || [])
          )
          .catch(() => setTables([]));
      }
    }, [accessToken, id, business?.id])
  );

  async function changeStatus(request, nextStatus, action) {
    try {
      setBusy(action);
      await request(business.id, reservation.id, accessToken);
      setReservation((current) => ({
        ...current,
        status: nextStatus,
      }));
    } catch (actionError) {
      Alert.alert(
        "Niet gelukt",
        actionError?.message ||
          "De reservatie kon niet worden bijgewerkt."
      );
    } finally {
      setBusy(null);
    }
  }

  function confirmCancel() {
    Alert.alert(
      "Reservatie annuleren",
      "Weet je zeker dat je deze reservatie wilt annuleren?",
      [
        { text: "Nee", style: "cancel" },
        {
          text: "Ja, annuleren",
          style: "destructive",
          onPress: async () => {
            try {
              setBusy("cancel");
              await api.cancelReservation(id, accessToken);
              setReservation((current) => ({
                ...current,
                status: "CANCELLED",
              }));
            } catch (cancelError) {
              Alert.alert(
                "Annuleren mislukt",
                cancelError?.message ||
                  "De reservatie kon niet worden geannuleerd."
              );
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  }

  if (isLoading || error || !reservation) {
    return (
      <SafeAreaView style={styles.screen}>
        <BackBar onBack={() => router.back()} />
        <View style={styles.center}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.error}>
              {error || "Reservatie niet gevonden."}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const status = STATUS[reservation.status] ?? STATUS.CONFIRMED;
  const tablesText = tableNames(
    {
      tables: reservation.tables?.length
        ? reservation.tables
        : assigned,
    },
    tables
  );
  const isOpen = reservation.status === "CONFIRMED";

  return (
    <SafeAreaView style={styles.screen}>
      <BackBar onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Who and when */}

        <View style={styles.hero}>
          <Badge label={status.label} status={status.status} />
          <Text style={styles.name}>
            {reservation.firstName} {reservation.lastName}
          </Text>
          <Text style={styles.when}>
            {capitalize(formatLongDate(reservation.startTime))}
          </Text>
        </View>

        <Card style={styles.stats}>
          <Stat
            label="tijd"
            value={formatTime(reservation.startTime)}
            note={`tot ${formatTime(reservation.endTime)}`}
          />
          <Stat
            label="personen"
            value={String(reservation.guestCount)}
            note={guestLabel(reservation.guestCount)}
          />
          <Stat
            label="tafel"
            value={tablesText || "–"}
            note={tablesText ? "toegewezen" : "nog geen tafel"}
            last
          />
        </Card>

        {!!reservation.notes && (
          <View style={styles.note}>
            <StickyNote
              size={16}
              color="#8A5A14"
              strokeWidth={1.8}
            />
            <Text style={styles.noteText}>
              {reservation.notes}
            </Text>
          </View>
        )}

        <Card style={styles.details}>
          <DetailRow
            label="Telefoon"
            value={reservation.phoneNumber || "–"}
          />
          <DetailRow
            label="E-mail"
            value={reservation.email || "–"}
            last
          />
        </Card>

        {/* Next steps */}

        <View style={styles.actions}>
          {isOpen && (
            <Button
              label="Aan tafel"
              variant="primary"
              loading={busy === "seat"}
              onPress={() =>
                changeStatus(
                  api.markReservationAsSeated,
                  "SEATED",
                  "seat"
                )
              }
              icon={
                <Armchair
                  size={18}
                  color={colors.onPrimary}
                  strokeWidth={1.8}
                />
              }
            />
          )}

          {reservation.status === "SEATED" && (
            <Button
              label="Gasten vertrokken"
              variant="primary"
              loading={busy === "complete"}
              onPress={() =>
                changeStatus(
                  api.markReservationAsCompleted,
                  "COMPLETED",
                  "complete"
                )
              }
              icon={
                <DoorOpen
                  size={18}
                  color={colors.onPrimary}
                  strokeWidth={1.8}
                />
              }
            />
          )}

          <View style={styles.actionRow}>
            {!!reservation.phoneNumber && (
              <Button
                label="Bel"
                style={styles.actionItem}
                onPress={() =>
                  Linking.openURL(`tel:${reservation.phoneNumber}`)
                }
                icon={
                  <Phone
                    size={16}
                    color={colors.text}
                    strokeWidth={1.8}
                  />
                }
              />
            )}
            {isOpen && (
              <Button
                label="Bewerken"
                style={styles.actionItem}
                onPress={() =>
                  router.push(
                    `/reservation/edit?id=${reservation.id}`
                  )
                }
                icon={
                  <Pencil
                    size={16}
                    color={colors.text}
                    strokeWidth={1.8}
                  />
                }
              />
            )}
          </View>

          {isOpen && (
            <Button
              label="Reservatie annuleren"
              variant="danger"
              loading={busy === "cancel"}
              onPress={confirmCancel}
              icon={
                <X
                  size={16}
                  color={colors.danger}
                  strokeWidth={1.8}
                />
              }
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BackBar({ onBack }) {
  return (
    <View style={styles.backBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Terug"
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backPressed,
        ]}
      >
        <ChevronLeft
          size={20}
          color={colors.text}
          strokeWidth={1.8}
        />
      </Pressable>
      <Text style={styles.backTitle}>Reservatie</Text>
      <View style={styles.backSpacer} />
    </View>
  );
}

function Stat({ label, value, note, last }) {
  return (
    <View style={[styles.stat, !last && styles.statDivider]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={type.caption} numberOfLines={1}>
        {note}
      </Text>
    </View>
  );
}

function DetailRow({ label, value, last }) {
  return (
    <View
      style={[styles.detailRow, !last && styles.detailDivider]}
    >
      <Text style={type.caption}>{label}</Text>
      <Text
        style={[type.bodyMedium, styles.detailValue]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
    paddingHorizontal: spacing.xl,
    textAlign: "center",
  },

  // Back bar

  backBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },

  backButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  backPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  backTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  backSpacer: {
    width: touchTarget,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },

  // Hero

  hero: {
    alignItems: "flex-start",
    gap: spacing.sm,
  },

  name: {
    fontFamily: fonts.semibold,
    fontSize: 24,
    letterSpacing: -0.3,
    color: colors.text,
  },

  when: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: -4,
  },

  // Numbers

  stats: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
  },

  stat: {
    flex: 1,
    paddingHorizontal: spacing.md,
    gap: 2,
  },

  statDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },

  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  statValue: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.text,
  },

  note: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.sandSoft,
  },

  noteText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B5326",
  },

  details: {
    paddingVertical: spacing.xs,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  detailDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  detailValue: {
    flexShrink: 1,
    textAlign: "right",
  },

  // Actions

  actions: {
    gap: spacing.sm,
  },

  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  actionItem: {
    flex: 1,
  },
});
