import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { Banknote, Check, CreditCard, Plus, QrCode, Share2, X } from "lucide-react-native";

import { useAuth } from "../../../context/auth-context";
import { api } from "../../../services/api";
import { Button, Card, Sheet } from "../../../components/ui";
import { formatClock } from "../../../components/team/team-format";
import { t } from "../../../i18n";
import { colors, fonts, radius, spacing, type } from "../../../theme";
import { todayString } from "../../../utils/date";
import { formatDuration, formatPrice, parsePriceToCents } from "../../../utils/price";

// ======================================================
// Afrekenen (checkout of one appointment)
// ======================================================
//
// A ticket: the massage, products added at the counter
// and a tip for the therapist. Then how the customer pays:
//
//   QR-code       Stripe Checkout on the business's own
//                 Stripe account (Bancontact, Apple Pay,
//                 card); the screen waits until it is paid
//   Kaartterminal the business's own card machine
//   Contant       cash
//
// Terminal and cash are only registered. A paid
// appointment is marked as completed.
//
// Opened with ?date=YYYY-MM-DD, the day of the
// appointment.
// ======================================================

const TIPS = [
  { value: 0, label: () => t("checkout.tipNone") },
  { value: 5, label: () => "5%" },
  { value: 10, label: () => "10%" },
];

const POLL_MS = 2500;

export default function CheckoutScreen() {
  const router = useRouter();
  const { id, date } = useLocalSearchParams();
  const { business, accessToken } = useAuth();

  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState(null);
  const [extras, setExtras] = useState([]);
  const [tip, setTip] = useState({ kind: "percent", value: 0 });
  const [method, setMethod] = useState(null);
  const [stripe, setStripe] = useState(null);
  const [step, setStep] = useState("ticket");
  const [payment, setPayment] = useState(null);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      api.getMassageAppointments(business.id, date || todayString(), accessToken),
      api.getStripeStatus(business.id, accessToken).catch(() => null),
    ])
      .then(([appointments, stripeStatus]) => {
        if (!active) {
          return;
        }

        const found = appointments.data.find((item) => item.id === id);

        if (!found) {
          setError(t("common.error"));
          return;
        }

        setAppointment(found);
        setStripe(stripeStatus?.data ?? null);

        const qrReady = stripeStatus?.data?.chargesEnabled;
        setMethod(qrReady ? "STRIPE_LINK" : "CARD_TERMINAL");
      })
      .catch((loadError) => active && setError(loadError.message));

    return () => {
      active = false;
    };
  }, [business?.id, id, date, accessToken]);

  const items = appointment
    ? [{ name: appointment.serviceName, amountCents: appointment.priceCents }, ...extras]
    : [];

  const subtotal = items.reduce((sum, item) => sum + item.amountCents, 0);
  const tipCents =
    tip.kind === "percent" ? Math.round((subtotal * tip.value) / 100) : tip.value;
  const total = subtotal + tipCents;

  const finish = useCallback(
    async (paid) => {
      setPayment(paid);
      setStep("paid");

      try {
        const response = await api.getPaymentSummary(business.id, todayString(), accessToken);

        setSummary(response.data);
      } catch {
        setSummary(null);
      }
    },
    [business?.id, accessToken]
  );

  async function pay() {
    setBusy(true);

    try {
      const response = await api.createPayment(
        business.id,
        { appointmentId: appointment.id, method, items, tipCents },
        accessToken
      );

      if (response.data.status === "PAID") {
        await finish(response.data);
      } else {
        setPayment(response.data);
        setStep("qr");
      }
    } catch (payError) {
      Alert.alert(t("common.error"), payError.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelQr() {
    try {
      await api.cancelPayment(business.id, payment.id, accessToken);
    } catch {
      // It expires at Stripe by itself.
    }

    setPayment(null);
    setStep("ticket");
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.screen} edges={[]}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator style={styles.loading} />}
      </SafeAreaView>
    );
  }

  if (step === "qr" && payment) {
    return (
      <QrStep
        payment={payment}
        businessName={business?.name}
        onPaid={finish}
        onCancel={cancelQr}
      />
    );
  }

  if (step === "paid" && payment) {
    return (
      <PaidStep
        payment={payment}
        summary={summary}
        onDone={() => router.back()}
        onNext={() => router.replace("/massage/new-appointment")}
      />
    );
  }

  const qrReady = !!stripe?.chargesEnabled;
  const customer = `${appointment.firstName} ${appointment.lastName}`;

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={type.title}>{t("checkout.title")}</Text>

        <Card style={styles.customer}>
          <View style={styles.initials}>
            <Text style={styles.initialsText}>
              {`${appointment.firstName?.[0] ?? ""}${appointment.lastName?.[0] ?? ""}`.toUpperCase()}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text style={type.bodyMedium}>{customer}</Text>
            <Text style={type.caption}>
              {t("checkout.withTherapist", {
                room: appointment.roomName,
                therapist: appointment.therapistName,
                time: `${formatClock(appointment.startTime)} – ${formatClock(appointment.endTime)}`,
              })}
            </Text>
          </View>
        </Card>

        {/* Ticket */}

        <Card style={styles.ticket}>
          <View style={styles.line}>
            <Text style={[type.body, styles.flex]}>
              {appointment.serviceName} {formatDuration(appointment.durationMinutes)}
            </Text>
            <Text style={type.bodyMedium}>{formatPrice(appointment.priceCents)}</Text>
          </View>

          {extras.map((extra, index) => (
            <View key={`${extra.name}-${index}`} style={styles.line}>
              <Text style={[type.body, styles.flex]}>{extra.name}</Text>
              <Text style={type.bodyMedium}>{formatPrice(extra.amountCents)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("checkout.remove")}
                hitSlop={8}
                onPress={() => setExtras(extras.filter((_, other) => other !== index))}
              >
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            </View>
          ))}

          <Pressable accessibilityRole="button" onPress={() => setProductOpen(true)} style={styles.addLine}>
            <Plus size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.addText}>{t("checkout.addProduct")}</Text>
          </Pressable>

          <View style={styles.tipBlock}>
            <Text style={type.caption}>{t("checkout.tipFor", { name: appointment.therapistName })}</Text>
            <View style={styles.tips}>
              {TIPS.map((option) => {
                const selected = tip.kind === "percent" && tip.value === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setTip({ kind: "percent", value: option.value })}
                    style={[styles.tip, selected && styles.tipSelected]}
                  >
                    <Text style={[styles.tipText, selected && styles.tipTextSelected]}>{option.label()}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: tip.kind === "amount" }}
                onPress={() => setTipOpen(true)}
                style={[styles.tip, tip.kind === "amount" && styles.tipSelected]}
              >
                <Text style={[styles.tipText, tip.kind === "amount" && styles.tipTextSelected]}>
                  {tip.kind === "amount" ? formatPrice(tip.value) : t("checkout.tipOther")}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.line, styles.totalLine]}>
            <View style={styles.flex}>
              <Text style={styles.totalLabel}>{t("checkout.total")}</Text>
              <Text style={type.caption}>
                {t("checkout.vatNote")}
                {tipCents > 0 ? ` · ${t("checkout.tipNote", { amount: formatPrice(tipCents) })}` : ""}
              </Text>
            </View>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </Card>

        {/* Method */}

        <Text style={styles.label}>{t("checkout.payWith")}</Text>
        <View style={styles.methods}>
          <MethodTile
            icon={QrCode}
            title={t("checkout.qr")}
            hint={qrReady ? t("checkout.qrHint") : t("checkout.stripeOff")}
            selected={method === "STRIPE_LINK"}
            disabled={!qrReady}
            onPress={() => setMethod("STRIPE_LINK")}
          />
          <MethodTile
            icon={CreditCard}
            title={t("checkout.terminal")}
            hint={t("checkout.terminalHint")}
            selected={method === "CARD_TERMINAL"}
            onPress={() => setMethod("CARD_TERMINAL")}
          />
          <MethodTile
            icon={Banknote}
            title={t("checkout.cash")}
            hint={t("checkout.cashHint")}
            selected={method === "CASH"}
            onPress={() => setMethod("CASH")}
          />
        </View>

        <Button
          variant="primary"
          loading={busy}
          disabled={!method || total <= 0}
          label={
            method === "STRIPE_LINK"
              ? t("checkout.showQr")
              : t("checkout.receive", { amount: formatPrice(total) })
          }
          onPress={pay}
        />
      </ScrollView>

      <ProductSheet
        visible={productOpen}
        onClose={() => setProductOpen(false)}
        onAdd={(product) => {
          setExtras([...extras, product]);
          setProductOpen(false);
        }}
      />

      <AmountSheet
        visible={tipOpen}
        title={t("checkout.tipAmount")}
        onClose={() => setTipOpen(false)}
        onSave={(cents) => {
          setTip({ kind: "amount", value: cents });
          setTipOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function MethodTile({ icon: Icon, title, hint, selected, disabled, onPress }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.method, selected && styles.methodSelected, disabled && styles.methodDisabled]}
    >
      <Icon size={22} color={selected ? colors.primary : colors.textMuted} strokeWidth={1.8} />
      <Text style={[styles.methodTitle, selected && styles.methodTitleSelected]}>{title}</Text>
      <Text style={styles.methodHint} numberOfLines={3}>
        {hint}
      </Text>
    </Pressable>
  );
}

// ------------------------------------------------------
// Adding a product or a tip amount
// ------------------------------------------------------

function ProductSheet({ visible, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (visible) {
      setName("");
      setPrice("");
    }
  }, [visible]);

  const cents = parsePriceToCents(price);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("checkout.addProduct")}
      footer={
        <Button
          variant="primary"
          label={t("checkout.add")}
          disabled={!name.trim() || cents === null}
          onPress={() => onAdd({ name: name.trim(), amountCents: cents })}
        />
      }
    >
      <View style={styles.sheetBody}>
        <Text style={styles.label}>{t("checkout.productName")}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("checkout.productNamePlaceholder")}
          placeholderTextColor={colors.textDisabled}
          style={styles.input}
          autoFocus
        />
        <Text style={styles.label}>{t("checkout.productPrice")}</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="10,00"
          placeholderTextColor={colors.textDisabled}
          keyboardType="decimal-pad"
          style={styles.input}
        />
      </View>
    </Sheet>
  );
}

function AmountSheet({ visible, title, onClose, onSave }) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (visible) {
      setText("");
    }
  }, [visible]);

  const cents = parsePriceToCents(text);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <Button
          variant="primary"
          label={t("common.save")}
          disabled={cents === null}
          onPress={() => onSave(cents)}
        />
      }
    >
      <View style={styles.sheetBody}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="5,00"
          placeholderTextColor={colors.textDisabled}
          keyboardType="decimal-pad"
          style={styles.input}
          autoFocus
        />
      </View>
    </Sheet>
  );
}

// ------------------------------------------------------
// QR code: waiting for the customer
// ------------------------------------------------------

function QrStep({ payment, businessName, onPaid, onCancel }) {
  const { business, accessToken } = useAuth();
  const done = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(async () => {
        try {
          const response = await api.getPayment(business.id, payment.id, accessToken);

          if (response.data.status === "PAID" && !done.current) {
            done.current = true;
            onPaid(response.data);
          } else if (response.data.status === "CANCELLED" && !done.current) {
            done.current = true;
            onCancel();
          }
        } catch {
          // Try again on the next tick.
        }
      }, POLL_MS);

      return () => clearInterval(timer);
    }, [business?.id, payment.id, accessToken, onPaid, onCancel])
  );

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.qrContent}>
        <Text style={type.caption}>{businessName}</Text>
        <Text style={styles.qrAmount}>{formatPrice(payment.totalCents)}</Text>
        <Text style={type.caption}>{payment.items[0]?.name}</Text>

        <View style={styles.qrBox}>
          <QRCode value={payment.checkoutUrl} size={230} color="#1C2421" backgroundColor="#FFFFFF" />
        </View>

        <Text style={type.bodyMedium}>{t("checkout.scan")}</Text>
        <View style={styles.brands}>
          {["Bancontact", "Apple Pay", t("checkout.methods.card")].map((brand) => (
            <View key={brand} style={styles.brand}>
              <Text style={styles.brandText}>{brand}</Text>
            </View>
          ))}
        </View>

        <View style={styles.waiting}>
          <ActivityIndicator color={colors.primary} />
          <Text style={type.caption}>{t("checkout.waiting")}</Text>
        </View>

        <Button
          label={t("checkout.shareLink")}
          icon={<Share2 size={18} color={colors.text} strokeWidth={1.8} />}
          onPress={() =>
            Share.share({
              message: t("checkout.shareMessage", { business: businessName, url: payment.checkoutUrl }),
            })
          }
          style={styles.wide}
        />
        <Button label={t("checkout.cancelQr")} variant="ghost" onPress={onCancel} style={styles.wide} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ------------------------------------------------------
// Paid
// ------------------------------------------------------

function PaidStep({ payment, summary, onDone, onNext }) {
  const methodLabel =
    payment.method === "STRIPE_LINK" && payment.stripeMethod
      ? t(`checkout.methods.${payment.stripeMethod}`) ?? payment.stripeMethod
      : t(`checkout.methods.${payment.method}`);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.qrContent}>
        <View style={styles.paidIcon}>
          <Check size={44} color={colors.onPrimary} strokeWidth={2.5} />
        </View>
        <Text style={styles.paidTitle}>{t("checkout.paid")}</Text>
        <Text style={type.body}>
          {t("checkout.paidLine", {
            amount: formatPrice(payment.totalCents),
            method: methodLabel,
            time: formatClock(payment.paidAt ?? new Date().toISOString()),
          })}
        </Text>

        {summary ? (
          <Card style={styles.summary}>
            <Text style={styles.label}>{t("checkout.received")}</Text>
            <View style={styles.summaryRow}>
              <SummaryItem value={formatPrice(summary.stripeCents + summary.terminalCents)} label={t("checkout.cardAndQr")} />
              <SummaryItem value={formatPrice(summary.cashCents)} label={t("checkout.cashTotal")} />
              <SummaryItem value={formatPrice(summary.tipCents)} label={t("checkout.tips")} />
            </View>
          </Card>
        ) : null}

        <Button label={t("checkout.nextAppointment")} onPress={onNext} style={styles.wide} />
        <Button label={t("checkout.done")} variant="primary" onPress={onDone} style={styles.wide} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryItem({ value, label }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loading: {
    marginTop: spacing.xxl,
  },

  error: {
    margin: spacing.xl,
    fontFamily: fonts.regular,
    color: colors.danger,
  },

  content: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
    gap: spacing.md,
  },

  flex: {
    flex: 1,
  },

  customer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  initials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  initialsText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },

  ticket: {
    gap: spacing.sm,
  },

  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },

  addLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.xs,
  },

  addText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },

  tipBlock: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  tips: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  tip: {
    flex: 1,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  tipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  tipText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },

  tipTextSelected: {
    color: colors.onPrimary,
  },

  totalLine: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },

  totalLabel: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },

  totalValue: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    color: colors.text,
  },

  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  methods: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  method: {
    flex: 1,
    minHeight: 112,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: 4,
  },

  methodSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.primarySoft,
  },

  methodDisabled: {
    opacity: 0.55,
  },

  methodTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
  },

  methodTitleSelected: {
    color: colors.primary,
  },

  methodHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },

  sheetBody: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },

  input: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },

  // QR

  qrContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },

  qrAmount: {
    fontFamily: fonts.semibold,
    fontSize: 36,
    color: colors.text,
  },

  qrBox: {
    padding: spacing.lg,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },

  brands: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  brand: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surface,
  },

  brandText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },

  waiting: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.md,
  },

  wide: {
    alignSelf: "stretch",
    maxWidth: 420,
    width: "100%",
  },

  // Paid

  paidIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  paidTitle: {
    fontFamily: fonts.semibold,
    fontSize: 28,
    color: colors.text,
    marginTop: spacing.sm,
  },

  summary: {
    alignSelf: "stretch",
    maxWidth: 420,
    width: "100%",
    marginVertical: spacing.lg,
  },

  summaryRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
  },

  summaryItem: {
    flex: 1,
    gap: 2,
  },

  summaryValue: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
  },
});
