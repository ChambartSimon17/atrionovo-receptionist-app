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
  Mail,
  MessageSquare,
  Phone,
  Plus,
} from "lucide-react-native";
import Columns from "../../../components/ui/Columns";
import useWideLayout from "../../../hooks/useWideLayout";

import { useAuth } from "../../../context/auth-context";
import { api } from "../../../services/api";
import {
  Badge,
  Button,
  Card,
} from "../../../components/ui";
import {
  colors,
  fonts,
  radius,
  spacing,
  touchTarget,
  type,
} from "../../../theme";
import { formatTime } from "../../../utils/date";
import { formatPrice } from "../../../utils/price";
import { Skeleton, SkeletonList } from "../../../components/ui";

// ======================================================
// Klantprofiel
// ======================================================
//
// One customer of a massage business: contact buttons,
// a few numbers (visits, spent, how often they come,
// no-shows), their favourite massage, the notes and every
// appointment they had.
// ======================================================

const STATUS_LABELS = {
  CONFIRMED: "Bevestigd",
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

function customerStats(appointments) {
  const completed = appointments.filter(
    (appointment) => appointment.status === "COMPLETED"
  );

  const spentCents = completed.reduce(
    (sum, appointment) =>
      sum + (appointment.priceCents ?? 0),
    0
  );

  const noShows = appointments.filter(
    (appointment) => appointment.status === "NO_SHOW"
  ).length;

  // Average weeks between completed visits.
  const visitTimes = completed
    .map((appointment) =>
      new Date(appointment.startTime).getTime()
    )
    .sort((a, b) => a - b);

  const weeksBetween =
    visitTimes.length > 1
      ? (visitTimes[visitTimes.length - 1] - visitTimes[0]) /
        (visitTimes.length - 1) /
        (7 * 24 * 60 * 60 * 1000)
      : null;

  const serviceCounts = completed.reduce(
    (counts, appointment) => {
      counts[appointment.serviceName] =
        (counts[appointment.serviceName] ?? 0) + 1;
      return counts;
    },
    {}
  );

  const favourite = Object.entries(serviceCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  return {
    visits: completed.length,
    spentCents,
    noShows,
    weeksBetween,
    favourite,
    lastVisit: completed.length
      ? completed.reduce((latest, appointment) =>
          new Date(appointment.startTime) >
          new Date(latest.startTime)
            ? appointment
            : latest
        )
      : null,
  };
}

export default function MassageClientScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams();

  const { accessToken } = useAuth();

  const [customer, setCustomer] = useState(null);
  const wide = useWideLayout();
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
            appointments: data.appointments || [],
          });
        })
        .catch((loadError) =>
          setError(
            loadError?.message ||
              "De klant kon niet worden geladen."
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
            <View style={{ width: "100%", gap: 12 }}>
              <Skeleton width="55%" height={26} />
              <Skeleton width="35%" height={14} />
              <Skeleton height={90} />
              <SkeletonList rows={3} />
            </View>
          ) : (
            <Text style={styles.error}>
              {error || "Klant niet gevonden."}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const stats = customerStats(customer.appointments);

  return (
    <SafeAreaView style={styles.screen}>
      <BackBar onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.content, wide && styles.contentWide]}>
        <Columns
          gap={spacing.lg}
          left={
            <>
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
                        color={colors.noteText}
                      />
                    )}
                    {stats.noShows > 0 && (
                      <Badge
                        label={`${stats.noShows}× no-show`}
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
                  label="besteed"
                  value={formatPrice(stats.spentCents).replace(
                    ",00",
                    ""
                  )}
                />
                <Stat
                  label="komt elke"
                  value={
                    stats.weeksBetween === null
                      ? "–"
                      : `${Math.max(
                          1,
                          Math.round(stats.weeksBetween)
                        )} wk`
                  }
                />
                <Stat
                  label="no-shows"
                  value={String(stats.noShows)}
                  last
                />
              </Card>

              {/* Details */}

              <Card style={styles.details}>
                <DetailRow
                  label="Favoriete massage"
                  value={stats.favourite || "–"}
                />
                <DetailRow
                  label="Laatste bezoek"
                  value={
                    stats.lastVisit
                      ? formatShortDate(stats.lastVisit.startTime)
                      : "–"
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

            </>
          }
          right={
            <>
              {/* History */}

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={type.heading}>Geschiedenis</Text>
                  <Text style={type.caption}>
                    {customer.appointments.length}
                  </Text>
                </View>

                {customer.appointments.length === 0 ? (
                  <Card>
                    <Text style={type.caption}>
                      Nog geen afspraken.
                    </Text>
                  </Card>
                ) : (
                  <Card style={styles.history}>
                    {customer.appointments.map(
                      (appointment, index) => (
                        <View
                          key={appointment.id}
                          style={[
                            styles.historyRow,
                            index > 0 && styles.historyDivider,
                          ]}
                        >
                          <View style={styles.historyText}>
                            <Text style={type.bodyMedium}>
                              {appointment.serviceName}
                            </Text>
                            <Text style={type.caption}>
                              {formatShortDate(
                                appointment.startTime
                              )}{" "}
                              · {formatTime(appointment.startTime)}{" "}
                              · {formatPrice(appointment.priceCents)}
                            </Text>
                          </View>
                          <Badge
                            label={STATUS_LABELS[appointment.status]}
                            status={appointment.status}
                          />
                        </View>
                      )
                    )}
                  </Card>
                )}
              </View>

              <Button
                label="Nieuwe afspraak"
                variant="primary"
                icon={
                  <Plus
                    size={18}
                    color={colors.onPrimary}
                    strokeWidth={2}
                  />
                }
                onPress={() =>
                  router.push("/massage/new-appointment")
                }
              />
            </>
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
      <Text style={styles.backTitle}>Klant</Text>
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

  // Tablet in landscape: two columns

  contentWide: {
    maxWidth: 1180,
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
    color: colors.noteText,
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
    backgroundColor: colors.noteBackground,
    borderWidth: 1,
    borderColor: colors.noteBorder,
    borderRadius: radius.xl,
    padding: spacing.md + 2,
    gap: spacing.xs,
  },

  notesLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.noteText,
  },

  notesText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.noteStrong,
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

  historyDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  historyText: {
    flex: 1,
    gap: 2,
  },
});
