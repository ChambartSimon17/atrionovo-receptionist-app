import {
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
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
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquare,
  Phone,
  Plus,
} from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import {
  Badge,
  Button,
  Card,
} from "../../components/ui";
import {
  colors,
  fonts,
  radius,
  spacing,
  touchTarget,
  type,
} from "../../theme";
import { guestSummary } from "../../hooks/useGuestHistory";
import { formatTime } from "../../utils/date";

// ======================================================
// Gastprofiel
// ======================================================
//
// One guest of a restaurant: contact buttons, a few
// numbers (visits, usual party size, missed and cancelled
// reservations), the notes and every reservation they
// made. Tapping a reservation opens it.
// ======================================================

const STATUS_LABELS = {
  CONFIRMED: "Bevestigd",
  SEATED: "Aan tafel",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
  NO_SHOW: "Niet verschenen",
};

const MONTHS_SHORT = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

function formatShortDate(isoString) {
  const date = new Date(isoString);

  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function initials(customer) {
  return `${customer.firstName?.[0] ?? ""}${
    customer.lastName?.[0] ?? ""
  }`.toUpperCase();
}

function isMissed(reservation, now) {
  return (
    reservation.status === "CONFIRMED" &&
    new Date(reservation.endTime) < now
  );
}

export default function GuestProfileScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams();

  const { accessToken } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken || !id) {
        return;
      }

      setError(null);

      api
        .getCustomer(id, accessToken)
        .then((response) => {
          const data = response?.data || response;

          setCustomer({
            ...data.customer,
            reservations: data.reservations || [],
          });
        })
        .catch((loadError) =>
          setError(
            loadError?.message ||
              "De gast kon niet worden geladen."
          )
        )
        .finally(() => setIsLoading(false));
    }, [accessToken, id])
  );

  if (isLoading || error || !customer) {
    return (
      <SafeAreaView style={styles.screen}>
        <BackBar onBack={() => router.back()} />
        <View style={styles.center}>
          {isLoading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.error}>
              {error || "Gast niet gevonden."}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const now = new Date();
  const stats = guestSummary(customer, now);

  return (
    <SafeAreaView style={styles.screen}>
      <BackBar onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}

        <View style={styles.profile}>
          <View
            style={[
              styles.avatar,
              customer.isVip && styles.vipAvatar,
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                customer.isVip && styles.vipAvatarText,
              ]}
            >
              {initials(customer)}
            </Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name}>
              {customer.firstName} {customer.lastName}
            </Text>
            <View style={styles.tags}>
              {customer.isVip && (
                <Badge
                  label="VIP"
                  background={colors.sandSoft}
                  color="#6B5326"
                />
              )}
              {stats.visits >= 3 && (
                <Badge label="Vaste gast" status="SEATED" />
              )}
              {stats.missed > 0 && (
                <Badge
                  label={`${stats.missed}× niet gekomen`}
                  status="NO_SHOW"
                />
              )}
              {!!customer.createdAt && (
                <Badge
                  label={`Sinds ${formatShortDate(
                    customer.createdAt
                  )}`}
                />
              )}
            </View>
          </View>
        </View>

        {/* Contact */}

        <View style={styles.contactRow}>
          <ContactButton
            label="Bel"
            icon={Phone}
            onPress={() =>
              Linking.openURL(`tel:${customer.phoneNumber}`)
            }
          />
          <ContactButton
            label="SMS"
            icon={MessageSquare}
            onPress={() =>
              Linking.openURL(`sms:${customer.phoneNumber}`)
            }
          />
          <ContactButton
            label="E-mail"
            icon={Mail}
            disabled={!customer.email}
            onPress={() =>
              Linking.openURL(`mailto:${customer.email}`)
            }
          />
        </View>

        {/* Numbers */}

        <Card style={styles.stats}>
          <Stat label="bezoeken" value={String(stats.visits)} />
          <Stat
            label="gem. groep"
            value={
              stats.averageParty === null
                ? "–"
                : String(Math.round(stats.averageParty * 10) / 10)
            }
          />
          <Stat
            label="niet gekomen"
            value={String(stats.missed)}
          />
          <Stat
            label="geannuleerd"
            value={String(stats.cancelled)}
            last
          />
        </Card>

        {/* Details */}

        <Card style={styles.details}>
          <DetailRow
            label="Laatste bezoek"
            value={
              stats.lastVisit
                ? formatShortDate(stats.lastVisit.startTime)
                : "–"
            }
          />
          <DetailRow
            label="Gepland"
            value={
              stats.upcoming === 1
                ? "1 reservatie"
                : `${stats.upcoming} reservaties`
            }
          />
          <DetailRow
            label="Telefoon"
            value={customer.phoneNumber}
          />
          <DetailRow
            label="E-mail"
            value={customer.email || "–"}
            last
          />
        </Card>

        {!!customer.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notitie</Text>
            <Text style={styles.notesText}>
              {customer.notes}
            </Text>
          </View>
        )}

        {/* History */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={type.heading}>Geschiedenis</Text>
            <Text style={type.caption}>
              {customer.reservations.length}
            </Text>
          </View>

          {customer.reservations.length === 0 ? (
            <Card>
              <Text style={type.caption}>
                Nog geen reservaties.
              </Text>
            </Card>
          ) : (
            <Card style={styles.history}>
              {customer.reservations.map(
                (reservation, index) => {
                  const status = isMissed(reservation, now)
                    ? "NO_SHOW"
                    : reservation.status;

                  return (
                    <Pressable
                      key={reservation.id}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push(
                          `/reservation/${reservation.id}`
                        )
                      }
                      style={({ pressed }) => [
                        styles.historyRow,
                        index > 0 && styles.historyDivider,
                        pressed && styles.historyPressed,
                      ]}
                    >
                      <View style={styles.historyText}>
                        <Text style={type.bodyMedium}>
                          {formatShortDate(
                            reservation.startTime
                          )}
                        </Text>
                        <Text
                          style={type.caption}
                          numberOfLines={1}
                        >
                          {formatTime(reservation.startTime)} ·{" "}
                          {reservation.guestCount === 1
                            ? "1 persoon"
                            : `${reservation.guestCount} personen`}
                          {reservation.notes
                            ? ` · ${reservation.notes}`
                            : ""}
                        </Text>
                      </View>
                      <Badge
                        label={STATUS_LABELS[status]}
                        status={status}
                      />
                      <ChevronRight
                        size={16}
                        color={colors.textMuted}
                        strokeWidth={1.8}
                      />
                    </Pressable>
                  );
                }
              )}
            </Card>
          )}
        </View>

        <Button
          label="Nieuwe reservatie"
          variant="primary"
          icon={
            <Plus
              size={18}
              color={colors.onPrimary}
              strokeWidth={2}
            />
          }
          onPress={() =>
            router.push("/reservation/new")
          }
        />
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
        style={styles.backButton}
      >
        <ChevronLeft
          size={20}
          color={colors.text}
          strokeWidth={1.8}
        />
      </Pressable>
      <Text style={styles.backTitle}>Gast</Text>
      <View style={styles.backSpacer} />
    </View>
  );
}

function ContactButton({ label, icon: Icon, onPress, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.contactButton,
        pressed && styles.contactPressed,
        disabled && styles.contactDisabled,
      ]}
    >
      <Icon
        size={16}
        color={disabled ? colors.textDisabled : colors.primary}
        strokeWidth={1.8}
      />
      <Text
        style={[
          styles.contactLabel,
          disabled && { color: colors.textDisabled },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Stat({ label, value, last }) {
  return (
    <View style={[styles.stat, !last && styles.statDivider]}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  },

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

  backTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
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
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },

  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md + 2,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  vipAvatar: {
    backgroundColor: colors.sandSoft,
  },

  avatarText: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.primary,
  },

  vipAvatarText: {
    color: "#6B5326",
  },

  profileText: {
    flex: 1,
    gap: 6,
  },

  name: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.text,
  },

  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  contactRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  contactButton: {
    flex: 1,
    minHeight: touchTarget,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  contactPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  contactDisabled: {
    opacity: 0.6,
  },

  contactLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },

  stats: {
    flexDirection: "row",
    paddingHorizontal: 0,
    paddingVertical: spacing.md,
  },

  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 4,
  },

  statDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },

  statValue: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
  },

  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },

  details: {
    paddingVertical: spacing.xs,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 11,
  },

  detailDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  detailValue: {
    flexShrink: 1,
    fontSize: 13,
  },

  notes: {
    backgroundColor: "#FBF6EC",
    borderWidth: 1,
    borderColor: "#EADCC0",
    borderRadius: radius.xl,
    padding: spacing.md + 2,
    gap: spacing.xs,
  },

  notesLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: "#6B5326",
  },

  notesText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: "#3B3324",
  },

  section: {
    gap: spacing.sm,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  history: {
    paddingVertical: spacing.xs,
  },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  historyPressed: {
    opacity: 0.7,
  },

  historyDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  historyText: {
    flex: 1,
    gap: 2,
  },
});
