import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  Search,
} from "lucide-react-native";

import { Badge, Chip } from "../../components/ui";
import useGuestHistory, {
  guestSummary,
} from "../../hooks/useGuestHistory";
import {
  colors,
  fonts,
  radius,
  spacing,
  type,
} from "../../theme";
import { RefreshControl } from "react-native";
import { SkeletonList } from "../../components/ui";
import { EmbeddedContext } from "../../components/embedded";
import useWideLayout from "../../hooks/useWideLayout";
import GuestProfileScreen from "../customers/[id]";

// ======================================================
// Gasten
// ======================================================
//
// The CRM of a restaurant: every guest, searchable by
// name, phone number or e-mail. Once their history is
// loaded each row shows how often they came, and the
// filters pick out the regulars (3 visits or more), new
// guests (at most one visit) and VIPs. Tapping a guest
// opens their profile.
// ======================================================

const REGULAR_VISITS = 3;

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

function shortDate(isoString) {
  const date = new Date(isoString);

  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

function matchesFilter(filter, guest, summary) {
  switch (filter) {
    case "regular":
      return summary !== null && summary.visits >= REGULAR_VISITS;
    case "new":
      return summary !== null && summary.visits <= 1;
    case "vip":
      return guest.isVip;
    default:
      return true;
  }
}

function initials(customer) {
  return `${customer.firstName?.[0] ?? ""}${
    customer.lastName?.[0] ?? ""
  }`.toUpperCase();
}

export default function RestaurantGuestsScreen() {
  const router = useRouter();
  const wide = useWideLayout();
  const [selectedId, setSelectedId] = useState(null);

  const { guests, list, error, reload } = useGuestHistory();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const customers = list ?? [];
  const isLoading = list === null && !error;

  const now = new Date();
  const summaries = new Map(
    (guests ?? []).map((guest) => [
      guest.id,
      guestSummary(guest, now),
    ])
  );

  function summaryOf(guest) {
    return summaries.get(guest.id) ?? null;
  }

  function count(key) {
    return customers.filter((guest) =>
      matchesFilter(key, guest, summaryOf(guest))
    ).length;
  }

  const query = search.trim().toLowerCase();

  const visible = customers
    .filter((customer) =>
      matchesFilter(filter, customer, summaryOf(customer))
    )
    .filter((customer) => {
      if (!query) {
        return true;
      }

      return (
        `${customer.firstName} ${customer.lastName}`
          .toLowerCase()
          .includes(query) ||
        customer.phoneNumber
          ?.toLowerCase()
          .includes(query) ||
        customer.email?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`
      )
    );

  const filters = [
    { key: "all", label: "Alle" },
    ...(guests
      ? [
          {
            key: "regular",
            label: `Vaste gasten (${count("regular")})`,
          },
          { key: "new", label: `Nieuw (${count("new")})` },
        ]
      : []),
    { key: "vip", label: `VIP (${count("vip")})` },
  ];

  // On a tablet the chosen guest opens next to the list.
  const openId = wide
    ? visible.some((customer) => customer.id === selectedId)
      ? selectedId
      : visible[0]?.id ?? null
    : null;

  const guestList = (
    <>
        <View style={styles.top}>
          <View style={styles.titleText}>
            <Text style={type.title}>Gasten</Text>
            <Text style={type.caption}>
              {customers.length === 1
                ? "1 gast"
                : `${customers.length} gasten`}
              {list && !guests ? " · bezoeken laden…" : ""}
            </Text>
          </View>

          <View style={styles.searchBox}>
            <Search
              size={18}
              color={colors.textMuted}
              strokeWidth={1.8}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Zoek op naam, telefoon of e-mail"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={styles.searchInput}
            />
          </View>

          <ScrollView
            horizontal
            style={styles.filterScroll}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {filters.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                selected={filter === item.key}
                onPress={() => setFilter(item.key)}
              />
            ))}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.list}>
            <SkeletonList rows={7} />
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(customer) => customer.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={async () => {
                  setIsRefreshing(true);
                  await reload();
                  setIsRefreshing(false);
                }}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                {query || filter !== "all"
                  ? "Geen gasten gevonden."
                  : "Nog geen gasten. Ze verschijnen hier na hun eerste reservatie."}
              </Text>
            }
            renderItem={({ item, index }) => {
              const summary = summaryOf(item);

              return (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    wide
                      ? setSelectedId(item.id)
                      : router.push(`/customers/${item.id}`)
                  }
                  style={({ pressed }) => [
                    styles.row,
                    index === 0 && styles.firstRow,
                    index === visible.length - 1 &&
                      styles.lastRow,
                    item.id === openId && styles.rowSelected,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.avatar,
                      item.isVip && styles.vipAvatar,
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        item.isVip && styles.vipAvatarText,
                      ]}
                    >
                      {initials(item)}
                    </Text>
                  </View>
                  <View style={styles.rowText}>
                    <View style={styles.nameRow}>
                      <Text
                        style={[type.bodyMedium, styles.name]}
                        numberOfLines={1}
                      >
                        {item.firstName} {item.lastName}
                      </Text>
                      {item.isVip && (
                        <Badge
                          label="VIP"
                          background={colors.sandSoft}
                          color={colors.noteText}
                        />
                      )}
                      {summary?.missed > 0 && (
                        <Badge
                          label={`${summary.missed}× niet gekomen`}
                          status="NO_SHOW"
                        />
                      )}
                    </View>
                    <Text style={type.caption} numberOfLines={1}>
                      {summary
                        ? [
                            summary.visits === 1
                              ? "1 bezoek"
                              : `${summary.visits} bezoeken`,
                            summary.lastVisit
                              ? `laatst ${shortDate(
                                  summary.lastVisit.startTime
                                )}`
                              : null,
                            summary.upcoming > 0
                              ? `${summary.upcoming} gepland`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : item.phoneNumber}
                    </Text>
                  </View>
                  <ChevronRight
                    size={18}
                    color={colors.textMuted}
                    strokeWidth={1.8}
                  />
                </Pressable>
              );
            }}
          />
        )}
    </>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {wide ? (
        <View style={styles.split}>
          <View style={styles.listPane}>{guestList}</View>
          <View style={styles.detailPane}>
            <EmbeddedContext.Provider value={true}>
              {openId ? <GuestProfileScreen key={openId} customerId={openId} /> : null}
            </EmbeddedContext.Provider>
          </View>
        </View>
      ) : (
        guestList
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  top: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md + 2,
  },

  titleText: {
    gap: spacing.xs,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.sm,
  },

  filters: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },

  filterScroll: {
    flexGrow: 0,
    marginHorizontal: -spacing.xl,
  },

  loading: {
    marginTop: spacing.xxl,
  },

  error: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
    paddingHorizontal: spacing.xl,
  },

  empty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.xxl,
  },

  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },

  firstRow: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },

  lastRow: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },

  rowSelected: {
    backgroundColor: colors.primarySoft,
  },

  // Tablet in landscape: list left, guest right

  split: {
    flex: 1,
    flexDirection: "row",
  },

  listPane: {
    width: 440,
  },

  detailPane: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },

  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  vipAvatar: {
    backgroundColor: colors.sandSoft,
  },

  avatarText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },

  vipAvatarText: {
    color: colors.noteText,
  },

  rowText: {
    flex: 1,
    gap: 2,
  },

  name: {
    flexShrink: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
