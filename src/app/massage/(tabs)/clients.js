import {
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useRouter,
} from "expo-router";
import {
  ChevronRight,
  Search,
} from "lucide-react-native";

import { useAuth } from "../../../context/auth-context";
import { api } from "../../../services/api";
import { Badge, Chip } from "../../../components/ui";
import {
  colors,
  fonts,
  radius,
  spacing,
  type,
} from "../../../theme";
import { RefreshControl } from "react-native";
import { SkeletonList } from "../../../components/ui";

// ======================================================
// Klanten
// ======================================================
//
// The CRM of a massage business: every customer, searchable
// by name, phone number or e-mail, with a VIP filter.
// Tapping a customer opens their profile.
// ======================================================

function initials(customer) {
  return `${customer.firstName?.[0] ?? ""}${
    customer.lastName?.[0] ?? ""
  }`.toUpperCase();
}

export default function MassageClientsScreen() {
  const router = useRouter();

  const { accessToken } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [vipOnly, setVipOnly] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) {
        return;
      }

      setError(null);

      api
        .getCustomers(accessToken)
        .then((response) =>
          setCustomers(response?.data || response || [])
        )
        .catch((loadError) =>
          setError(
            loadError?.message ||
              "De klanten konden niet worden geladen."
          )
        )
        .finally(() => {
          setIsLoading(false);
          setIsRefreshing(false);
        });
    }, [accessToken, refreshKey])
  );

  const query = search.trim().toLowerCase();

  const visible = customers
    .filter((customer) => !vipOnly || customer.isVip)
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

  const vipCount = customers.filter(
    (customer) => customer.isVip
  ).length;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.top}>
        <View style={styles.titleText}>
          <Text style={type.title}>Klanten</Text>
          <Text style={type.caption}>
            {customers.length === 1
              ? "1 klant"
              : `${customers.length} klanten`}
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

        <View style={styles.filters}>
          <Chip
            label="Alle"
            selected={!vipOnly}
            onPress={() => setVipOnly(false)}
          />
          <Chip
            label={`VIP (${vipCount})`}
            selected={vipOnly}
            onPress={() => setVipOnly(true)}
          />
        </View>
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
              onRefresh={() => {
                setIsRefreshing(true);
                setRefreshKey((key) => key + 1);
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query || vipOnly
                ? "Geen klanten gevonden."
                : "Nog geen klanten. Ze verschijnen hier na hun eerste afspraak."}
            </Text>
          }
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push(`/massage/client/${item.id}`)
              }
              style={({ pressed }) => [
                styles.row,
                index === 0 && styles.firstRow,
                index === visible.length - 1 &&
                  styles.lastRow,
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
                    style={type.bodyMedium}
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
                </View>
                <Text style={type.caption} numberOfLines={1}>
                  {item.phoneNumber}
                  {item.email ? ` · ${item.email}` : ""}
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={colors.textMuted}
                strokeWidth={1.8}
              />
            </Pressable>
          )}
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

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
