import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { ChevronLeft, ChevronRight, Download } from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import { Button, Card, SegmentedControl, Sheet } from "../../components/ui";
import BuyerForm, { buyerIsComplete, EMPTY_BUYER, Field } from "../../components/invoicing/BuyerForm";
import { openBusinessFile, openDocumentPdf } from "../../components/invoicing/open-file";
import { locale, t } from "../../i18n";
import { colors, fonts, radius, spacing, type } from "../../theme";
import { formatPrice } from "../../utils/price";
import { useEmbedded } from "../../components/embedded";

// ======================================================
// Facturen (salon)
// ======================================================
//
// Every receipt, invoice and credit note of a month.
// Tap one to view it, mail it again, credit an invoice or
// turn a receipt into an invoice. Documents are never
// deleted. The month export is for the accountant.
// ======================================================

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key, delta) {
  const [year, month] = key.split("-").map(Number);

  return monthKey(new Date(year, month - 1 + delta, 1, 12));
}

export default function DocumentsScreen() {
  // Next to Meer on a tablet: use the whole pane.
  const embedded = useEmbedded();
  const { business, accessToken } = useAuth();

  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [kind, setKind] = useState("INVOICE");
  const [documents, setDocuments] = useState(null);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.getDocuments(business.id, { month, kind }, accessToken);

      setDocuments(response.data);
    } catch (error) {
      Alert.alert(t("common.error"), error.message);
    }
  }, [business?.id, month, kind, accessToken]);

  useFocusEffect(
    useCallback(() => {
      setDocuments(null);
      load();
    }, [load])
  );

  async function exportMonth() {
    setExporting(true);

    try {
      await openBusinessFile(business.id, `/documents/export?month=${month}`, `documenten-${month}.csv`, accessToken);
    } catch (error) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setExporting(false);
    }
  }

  async function view(doc) {
    try {
      await openDocumentPdf(business.id, doc, accessToken);
    } catch (error) {
      Alert.alert(t("common.error"), error.message);
    }
  }

  function credit(doc) {
    Alert.alert(t("documents.credit"), t("documents.creditConfirm", { number: doc.number }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("documents.credit"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.creditDocument(business.id, doc.id, accessToken);
            setSelected(null);
            load();
          } catch (error) {
            Alert.alert(t("common.error"), error.message);
          }
        },
      },
    ]);
  }

  const title = new Date(`${month}-15T12:00:00`).toLocaleDateString(locale, { month: "long", year: "numeric" });

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={[styles.content, embedded && styles.fill]}>
        <Text style={type.title}>{t("documents.title")}</Text>

        <SegmentedControl
          options={[
            { value: "INVOICE", label: t("documents.invoices") },
            { value: "RECEIPT", label: t("documents.receipts") },
          ]}
          value={kind}
          onChange={setKind}
        />

        <View style={styles.monthRow}>
          <Pressable accessibilityRole="button" onPress={() => setMonth(shiftMonth(month, -1))} style={styles.arrow}>
            <ChevronLeft size={18} color={colors.text} strokeWidth={1.8} />
          </Pressable>
          <Text style={styles.month}>{title.charAt(0).toUpperCase() + title.slice(1)}</Text>
          <Pressable accessibilityRole="button" onPress={() => setMonth(shiftMonth(month, 1))} style={styles.arrow}>
            <ChevronRight size={18} color={colors.text} strokeWidth={1.8} />
          </Pressable>
        </View>

        {!documents ? (
          <ActivityIndicator style={styles.loading} />
        ) : documents.length === 0 ? (
          <Text style={type.caption}>{t("documents.none")}</Text>
        ) : (
          <Card style={styles.list}>
            {documents.map((doc, index) => {
              const credit = doc.kind === "CREDIT_NOTE";

              return (
                <Pressable
                  key={doc.id}
                  accessibilityRole="button"
                  onPress={() => setSelected(doc)}
                  style={[styles.row, index > 0 && styles.divider]}
                >
                  <View style={styles.rowText}>
                    <Text style={type.bodyMedium}>{doc.number}</Text>
                    <Text style={type.caption} numberOfLines={1}>
                      {[
                        credit
                          ? t("documents.creditFor", { number: doc.relatedNumber })
                          : doc.buyer?.name,
                        new Date(doc.issuedAt).toLocaleDateString(locale, { day: "numeric", month: "short" }),
                        doc.followedBy
                          ? doc.kind === "RECEIPT"
                            ? t("documents.replacedBy", { number: doc.followedBy })
                            : t("documents.creditedBy", { number: doc.followedBy })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <View style={styles.rowEnd}>
                    <Text style={[styles.amount, credit && styles.negative]}>
                      {credit ? "− " : ""}
                      {formatPrice(doc.grossCents)}
                    </Text>
                    <StatusChip doc={doc} />
                  </View>
                </Pressable>
              );
            })}
          </Card>
        )}

        <Button
          label={t("documents.export")}
          loading={exporting}
          icon={<Download size={18} color={colors.text} strokeWidth={1.8} />}
          onPress={exportMonth}
        />
      </ScrollView>

      <Sheet
        visible={!!selected && !action}
        onClose={() => setSelected(null)}
        title={selected ? `${t(`documents.kinds.${selected.kind}`)} ${selected.number}` : ""}
        footer={
          selected ? (
            <>
              <Button label={t("documents.open")} variant="primary" onPress={() => view(selected)} />
              <Button
                label={selected.emailedAt ? t("documents.mailAgain") : t("documents.mail")}
                onPress={() => setAction({ type: "mail", email: selected.emailTo ?? "" })}
              />
              {selected.kind === "RECEIPT" && !selected.followedBy ? (
                <Button
                  label={t("documents.convert")}
                  onPress={() => setAction({ type: "convert", buyer: { ...EMPTY_BUYER, email: selected.emailTo ?? "" } })}
                />
              ) : null}
              {selected.kind === "INVOICE" && !selected.followedBy ? (
                <Button label={t("documents.credit")} variant="danger" onPress={() => credit(selected)} />
              ) : null}
            </>
          ) : null
        }
      >
        {selected ? (
          <View style={styles.detail}>
            {selected.buyer ? (
              <Text style={type.body}>
                {[selected.buyer.name, selected.buyer.vatNumber].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
            <Text style={type.caption}>
              {formatPrice(selected.grossCents)}
              {selected.emailedAt ? ` · ${t("proof.mailedTo", { email: selected.emailTo })}` : ""}
            </Text>
            {selected.emailError ? (
              <Text style={styles.warn}>{t("proof.mailError", { error: selected.emailError })}</Text>
            ) : null}
            {selected.peppolStatus === "NOT_CONFIGURED" || selected.peppolStatus === "PENDING" ? (
              <Text style={type.caption}>{t("proof.peppolPending")}</Text>
            ) : null}
          </View>
        ) : null}
      </Sheet>

      <ActionSheet
        action={action}
        document={selected}
        onClose={() => setAction(null)}
        onDone={() => {
          setAction(null);
          setSelected(null);
          load();
        }}
      />
    </SafeAreaView>
  );
}

function StatusChip({ doc }) {
  let label = null;
  let style = styles.chipMuted;

  if (doc.peppolStatus === "SENT" || doc.peppolStatus === "DELIVERED") {
    label = t("documents.peppolSent");
    style = styles.chipOn;
  } else if (doc.emailedAt) {
    label = t("documents.mailed");
    style = styles.chipInfo;
  } else if (doc.emailError) {
    label = t("documents.mailFailed");
    style = styles.chipWarn;
  }

  if (!label) {
    return null;
  }

  return (
    <View style={[styles.chip, style]}>
      <Text style={[styles.chipText, { color: StyleSheet.flatten(style).color }]}>{label}</Text>
    </View>
  );
}

function ActionSheet({ action, document, onClose, onDone }) {
  const { business, accessToken } = useAuth();
  const [value, setValue] = useState(null);
  const [busy, setBusy] = useState(false);

  const current = value ?? action;

  async function submit() {
    setBusy(true);

    try {
      if (current.type === "mail") {
        await api.emailDocument(business.id, document.id, current.email, accessToken);
      } else {
        await api.convertDocument(
          business.id,
          document.id,
          { buyer: current.buyer, email: current.buyer.email || null },
          accessToken
        );
      }

      setValue(null);
      onDone();
    } catch (error) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setBusy(false);
    }
  }

  if (!action) {
    return null;
  }

  const disabled =
    current.type === "mail" ? !current.email?.includes("@") : !buyerIsComplete(current.buyer);

  return (
    <Sheet
      visible
      onClose={() => {
        setValue(null);
        onClose();
      }}
      title={current.type === "mail" ? t("documents.emailTo") : t("documents.convert")}
      footer={<Button label={t("documents.send")} variant="primary" loading={busy} disabled={disabled} onPress={submit} />}
    >
      {current.type === "mail" ? (
        <Field
          label={t("proof.email")}
          value={current.email}
          onChangeText={(email) => setValue({ ...current, email })}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
        />
      ) : (
        <BuyerForm value={current.buyer} onChange={(buyer) => setValue({ ...current, buyer })} />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
    gap: spacing.md,
  },

  fill: {
    maxWidth: "100%",
  },

  loading: {
    marginTop: spacing.xl,
  },

  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  month: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },

  arrow: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  list: {
    paddingVertical: spacing.xs,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  rowText: {
    flex: 1,
    gap: 2,
  },

  rowEnd: {
    alignItems: "flex-end",
    gap: 4,
  },

  amount: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },

  negative: {
    color: colors.danger,
  },

  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
  },

  chipOn: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
  },

  chipInfo: {
    backgroundColor: colors.infoSoft,
    color: colors.info,
  },

  chipWarn: {
    backgroundColor: colors.warningSoft,
    color: colors.warning,
  },

  chipMuted: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },

  detail: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },

  warn: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.warning,
  },
});
