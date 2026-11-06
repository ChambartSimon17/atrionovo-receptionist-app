import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { ArrowLeft, Camera, Check, LogIn, LogOut, Lock, UserRound } from "lucide-react-native";

import { useAuth } from "../../context/auth-context";
import { api } from "../../services/api";
import Avatar from "../../components/team/Avatar";
import PinPad from "../../components/team/PinPad";
import { formatClock, formatMinutes, formatPeriods, formatWorked, fromKey } from "../../components/team/team-format";
import { locale, plural, t } from "../../i18n";
import { colors, fonts, radius, spacing, type } from "../../theme";

// ======================================================
// Prikklok (time clock)
// ======================================================
//
// A device at the counter, logged in as the owner, shows
// only this screen. A therapist:
//
//   1. types their name and picks it from the list
//   2. enters their 4-digit PIN
//   3. takes a selfie (counts down from 3)
//   4. sees "Ingeklokt om 09:54" or "Uitgeklokt"
//
// In or out follows from the last entry: someone who is
// in clocks out, everyone else clocks in.
//
// A therapist without a PIN creates one here ("Nieuw in
// het team?"): choose it, repeat it. Only the owner can
// reset a PIN.
//
// Leaving the time clock: hold the lock for 2 seconds.
// Without input for 30 seconds it returns to the start.
// ======================================================

const IDLE_MS = 30_000;
const RESULT_SECONDS = 6;

function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function greetingKey(date) {
  const hour = date.getHours();

  if (hour < 12) {
    return "clock.goodMorning";
  }

  return hour < 18 ? "clock.goodAfternoon" : "clock.goodEvening";
}

function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10_000);

    return () => clearInterval(timer);
  }, []);

  return now;
}

export default function ClockScreen() {
  const router = useRouter();
  const { business, accessToken } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= 700;

  const [staff, setStaff] = useState([]);
  const [step, setStep] = useState("home");
  const [query, setQuery] = useState("");
  const [person, setPerson] = useState(null);
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState(null);
  const [message, setMessage] = useState(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const lastInput = useRef(Date.now());

  const loadStaff = useCallback(async () => {
    try {
      const response = await api.getClockStaff(business.id, accessToken);

      setStaff(response.data.staff);
    } catch {
      // Keep the last list.
    }
  }, [business?.id, accessToken]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const reset = useCallback(() => {
    setStep("home");
    setQuery("");
    setPerson(null);
    setPin("");
    setFirstPin(null);
    setMessage(null);
    setResult(null);
    loadStaff();
  }, [loadStaff]);

  function touch() {
    lastInput.current = Date.now();
  }

  // Back to the start after a while without input.
  useEffect(() => {
    if (step === "home" || step === "result" || step === "camera") {
      return;
    }

    const timer = setInterval(() => {
      if (Date.now() - lastInput.current > IDLE_MS) {
        reset();
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [step, reset]);

  function choose(member) {
    touch();
    setPerson(member);
    setPin("");
    setMessage(null);
    setStep(member.hasPin ? "pin" : "create");
  }

  function showError(error) {
    setPin("");
    setShakeKey((key) => key + 1);

    if (error.code === "PIN_INCORRECT") {
      setMessage(plural("clock.wrongPin", error.details?.[0]?.attemptsLeft ?? 0));
    } else if (error.code === "PIN_LOCKED") {
      setMessage(t("clock.locked"));
    } else {
      setMessage(error.message);
    }
  }

  async function verify(value) {
    setBusy(true);

    try {
      const response = await api.verifyClockPin(business.id, person.id, value, accessToken);

      setPerson((current) => ({ ...current, next: response.data.next }));
      setMessage(null);
      setStep("camera");
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function punch(photo) {
    try {
      const response = await api.punchClock(business.id, person.id, pin, photo, accessToken);

      setResult(response.data);
      setStep("result");
    } catch (error) {
      setStep("pin");
      showError(error);
    }
  }

  async function choosePin(value) {
    touch();

    if (!firstPin) {
      setFirstPin(value);
      setPin("");
      setMessage(null);
      return;
    }

    if (value !== firstPin) {
      setFirstPin(null);
      setPin("");
      setShakeKey((key) => key + 1);
      setMessage(t("clock.mismatch"));
      return;
    }

    setBusy(true);

    try {
      await api.createClockPin(business.id, person.id, value, accessToken);
      setResult({ action: "PIN", name: person.name });
      setStep("result");
    } catch (error) {
      setFirstPin(null);
      setPin("");
      setShakeKey((key) => key + 1);
      setMessage(error.code === "PIN_TOO_WEAK" ? t("clock.weak") : error.message);
    } finally {
      setBusy(false);
    }
  }

  function confirmExit() {
    Alert.alert(t("clock.exitTitle"), t("clock.exitMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("clock.exit"), style: "destructive", onPress: () => router.back() },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="auto" />

      <View style={styles.bar}>
        {step === "home" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("clock.exitHint")}
            delayLongPress={2000}
            onLongPress={confirmExit}
            onPress={() => Alert.alert(t("clock.exitHint"))}
            style={styles.barLeft}
          >
            <Lock size={16} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={type.caption}>
              {t("clock.title")} · {business?.name}
            </Text>
          </Pressable>
        ) : step !== "result" && step !== "camera" ? (
          <Pressable accessibilityRole="button" onPress={reset} hitSlop={10} style={styles.barLeft}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={1.8} />
            <Text style={type.bodyMedium}>{t("common.back")}</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Text style={type.caption}>
          {new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
        </Text>
      </View>

      {step === "home" ? (
        <HomeStep
          staff={staff}
          query={query}
          onQuery={(text) => {
            touch();
            setQuery(text);
          }}
          onChoose={choose}
          onCreate={() => {
            touch();
            setStep("who");
          }}
        />
      ) : null}

      {step === "who" ? <WhoStep staff={staff} onChoose={choose} /> : null}

      {step === "pin" && person ? (
        <View style={[styles.split, !wide && styles.stack]}>
          <PersonPanel person={person} index={staff.findIndex((member) => member.id === person.id)} />
          <View style={styles.padPanel}>
            <Text style={styles.padTitle}>{t("clock.yourPin")}</Text>
            <PinPad
              value={pin}
              onChange={(value) => {
                touch();
                setPin(value);
              }}
              onComplete={verify}
              shakeKey={shakeKey}
              disabled={busy}
              leftLabel={t("clock.forgot")}
              onLeft={() => setMessage(t("clock.forgotHint"))}
            />
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        </View>
      ) : null}

      {step === "create" && person ? (
        <View style={[styles.split, !wide && styles.stack]}>
          <View style={styles.personPanel}>
            <Avatar name={person.name} index={staff.findIndex((member) => member.id === person.id)} size={76} />
            <Text style={styles.personName}>{person.name}</Text>
            <Text style={[type.caption, styles.center]}>{t("clock.chooseHint")}</Text>
            <View style={styles.steps}>
              <StepChip label={t("clock.stepChoose")} active={!firstPin} />
              <StepChip label={t("clock.stepRepeat")} active={!!firstPin} />
            </View>
          </View>
          <View style={styles.padPanel}>
            <Text style={styles.padTitle}>
              {firstPin ? t("clock.repeatPinLabel") : t("clock.newPinLabel")}
            </Text>
            <PinPad
              value={pin}
              onChange={(value) => {
                touch();
                setPin(value);
              }}
              onComplete={choosePin}
              shakeKey={shakeKey}
              disabled={busy}
            />
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        </View>
      ) : null}

      {step === "camera" && person ? (
        <SelfieStep person={person} onPhoto={punch} onCancel={reset} />
      ) : null}

      {step === "result" && result ? <ResultStep result={result} onDone={reset} /> : null}
    </SafeAreaView>
  );
}

// ------------------------------------------------------
// 1. Start: the clock and one field
// ------------------------------------------------------

function HomeStep({ staff, query, onQuery, onChoose, onCreate }) {
  const now = useNow();
  const search = normalize(query);

  const matches = search
    ? staff.filter((member) => normalize(member.name).includes(search))
    : [];

  const present = staff.filter((member) => member.next === "OUT").length;
  const expected = staff.filter((member) => member.periods.length > 0).length;

  return (
    <ScrollView
      contentContainerStyle={styles.home}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {!search ? (
        <>
          <Text style={styles.bigClock}>{formatClock(now.toISOString())}</Text>
          <Text style={styles.homeHint}>{t("clock.typeName")}</Text>
        </>
      ) : null}

      <View style={styles.inputBox}>
        <UserRound size={20} color={colors.textMuted} strokeWidth={1.8} />
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder={t("clock.namePlaceholder")}
          placeholderTextColor={colors.textDisabled}
          autoCorrect={false}
          autoCapitalize="words"
          autoComplete="off"
          style={styles.input}
        />
      </View>

      {search ? (
        <View style={styles.suggestions}>
          {matches.length === 0 ? (
            <Text style={[type.caption, styles.noMatch]}>{t("clock.noMatch")}</Text>
          ) : (
            matches.map((member) => (
              <Pressable
                key={member.id}
                accessibilityRole="button"
                onPress={() => onChoose(member)}
                style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
              >
                <Avatar name={member.name} index={staff.indexOf(member)} size={40} />
                <Text style={styles.suggestionName}>{member.name}</Text>
                <NextChip member={member} />
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <>
          <View style={styles.counts}>
            <View style={[styles.countChip, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>
                {plural("clock.present", present)}
              </Text>
            </View>
            <View style={[styles.countChip, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.countText, { color: colors.textMuted }]}>
                {t("clock.expected", { count: expected })}
              </Text>
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={onCreate} style={styles.createLink}>
            <Text style={styles.createText}>{t("clock.newPin")}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function NextChip({ member }) {
  if (!member.hasPin) {
    return (
      <View style={[styles.chip, { backgroundColor: colors.warningSoft }]}>
        <Text style={[styles.chipText, { color: colors.warning }]}>{t("clock.noPin")}</Text>
      </View>
    );
  }

  if (member.next === "OUT") {
    return (
      <View style={[styles.chip, { backgroundColor: colors.primarySoft }]}>
        <Text style={[styles.chipText, { color: colors.primary }]}>
          {t("clock.inSince", { time: formatClock(member.inSince) })}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}>
      <Text style={[styles.chipText, { color: colors.textMuted }]}>{t("clock.clockIn")}</Text>
    </View>
  );
}

// ------------------------------------------------------
// Create a PIN: who are you?
// ------------------------------------------------------

function WhoStep({ staff, onChoose }) {
  return (
    <ScrollView contentContainerStyle={styles.who}>
      <Text style={styles.whoTitle}>{t("clock.whoAreYou")}</Text>
      <View style={styles.suggestions}>
        {staff.map((member, index) => (
          <Pressable
            key={member.id}
            accessibilityRole="button"
            disabled={member.hasPin}
            onPress={() => onChoose(member)}
            style={({ pressed }) => [
              styles.suggestion,
              member.hasPin && styles.disabledRow,
              pressed && styles.suggestionPressed,
            ]}
          >
            <Avatar name={member.name} index={index} size={40} />
            <Text style={styles.suggestionName}>{member.name}</Text>
            <View
              style={[
                styles.chip,
                { backgroundColor: member.hasPin ? colors.surfaceMuted : colors.warningSoft },
              ]}
            >
              <Text style={[styles.chipText, { color: member.hasPin ? colors.textMuted : colors.warning }]}>
                {member.hasPin ? t("clock.hasPin") : t("clock.noPin")}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Text style={type.caption}>{t("clock.notListed")}</Text>
    </ScrollView>
  );
}

// ------------------------------------------------------
// 2. PIN: who is clocking
// ------------------------------------------------------

function PersonPanel({ person, index }) {
  const out = person.next === "OUT";

  return (
    <View style={styles.personPanel}>
      <Avatar name={person.name} index={index} size={76} />
      <Text style={styles.personName}>{person.name}</Text>
      <View style={[styles.chip, { backgroundColor: out ? colors.primarySoft : colors.surfaceMuted }]}>
        {out ? (
          <LogOut size={14} color={colors.primary} strokeWidth={2} />
        ) : (
          <LogIn size={14} color={colors.textMuted} strokeWidth={2} />
        )}
        <Text style={[styles.chipText, { color: out ? colors.primary : colors.textMuted }]}>
          {out ? t("clock.clockOut") : t("clock.clockIn")}
        </Text>
      </View>
      <Text style={type.caption}>
        {person.periods.length
          ? t("clock.plannedToday", { hours: formatPeriods(person.periods) })
          : t("clock.notPlannedToday")}
      </Text>
    </View>
  );
}

function StepChip({ label, active }) {
  return (
    <View style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surfaceMuted }]}>
      <Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.textMuted }]}>{label}</Text>
    </View>
  );
}

// ------------------------------------------------------
// 3. Selfie
// ------------------------------------------------------

async function toSmallJpeg(uri) {
  const context = ImageManipulator.manipulate(uri).resize({ width: 480 });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });

  return saved.base64;
}

function SelfieStep({ person, onPhoto, onCancel }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [seconds, setSeconds] = useState(3);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const camera = useRef(null);
  const taken = useRef(false);

  const take = useCallback(async () => {
    if (taken.current) {
      return;
    }

    taken.current = true;
    setSending(true);

    let photo = null;

    try {
      const picture = await camera.current?.takePictureAsync({ quality: 0.5 });

      if (picture?.uri) {
        photo = await toSmallJpeg(picture.uri);
      }
    } catch {
      // No camera (a simulator) or the photo failed: clock
      // without a photo rather than not at all.
    }

    onPhoto(photo);
  }, [onPhoto]);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Count down once the camera shows a picture.
  useEffect(() => {
    if (!ready || sending) {
      return;
    }

    if (seconds === 0) {
      take();
      return;
    }

    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);

    return () => clearTimeout(timer);
  }, [ready, seconds, sending, take]);

  // Without camera access: clock without a photo after a
  // short wait, so nobody gets stuck.
  useEffect(() => {
    if (permission && !permission.granted && !permission.canAskAgain) {
      const timer = setTimeout(take, 2500);

      return () => clearTimeout(timer);
    }
  }, [permission, take]);

  const now = new Date();

  return (
    <View style={styles.selfie}>
      <View style={styles.cameraBox}>
        {permission?.granted ? (
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="front"
            onCameraReady={() => setReady(true)}
            onMountError={() => take()}
          />
        ) : (
          <View style={styles.noCamera}>
            <Camera size={32} color="#FFFFFF" strokeWidth={1.6} />
            <Text style={styles.cameraText}>{t("clock.cameraNeeded")}</Text>
          </View>
        )}

        <View style={styles.faceGuide} pointerEvents="none" />

        <View style={styles.cameraTop}>
          <Text style={styles.cameraText}>
            <Text style={styles.cameraStrong}>{person.name}</Text> ·{" "}
            {person.next === "OUT" ? t("clock.clockOut") : t("clock.clockIn")}
          </Text>
          <Text style={styles.cameraText}>{t("clock.pinOk")}</Text>
        </View>

        <View style={styles.cameraBottomText}>
          {sending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.cameraText}>{t("clock.lookAtCamera", { seconds })}</Text>
          )}
        </View>
      </View>

      <View style={styles.cameraBar}>
        <View>
          <Text style={styles.cameraTime}>{formatClock(now.toISOString())}</Text>
          <Text style={styles.cameraHint}>{t("clock.autoPhoto")}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("clock.lookAtCamera", { seconds: 0 })}
          disabled={sending || !ready}
          onPress={take}
          style={styles.shutter}
        >
          <Camera size={24} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCancel} disabled={sending} style={styles.cameraCancel}>
          <Text style={styles.cameraHint}>{t("common.cancel")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ------------------------------------------------------
// 4. Done
// ------------------------------------------------------

function ResultStep({ result, onDone }) {
  const [seconds, setSeconds] = useState(RESULT_SECONDS);

  useEffect(() => {
    if (seconds === 0) {
      onDone();
      return;
    }

    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);

    return () => clearTimeout(timer);
  }, [seconds, onDone]);

  const at = result.at ? new Date(result.at) : new Date();

  let icon;
  let title;
  let line;
  let cards = [];

  if (result.action === "PIN") {
    icon = "check";
    title = t("clock.pinCreated", { name: result.name });
    line = t("clock.pinCreatedHint");
  } else if (result.action === "IN") {
    icon = "check";
    title = t(greetingKey(at), { name: result.name });

    const timing =
      result.minutesEarly === null
        ? null
        : result.minutesEarly > 0
          ? t("clock.early", { minutes: result.minutesEarly })
          : result.minutesEarly < -5
            ? t("clock.late", { minutes: -result.minutesEarly })
            : t("clock.onTime");

    line = [t("clock.clockedInAt", { time: formatClock(result.at) }), timing].filter(Boolean).join(" · ");

    cards = [
      result.firstAppointment
        ? {
            label: t("clock.nextAppointment"),
            value: `${formatClock(result.firstAppointment.startTime)} · ${result.firstAppointment.roomName}`,
          }
        : null,
      { label: t("clock.todayCount"), value: plural("clock.massages", result.appointmentCount) },
    ].filter(Boolean);
  } else {
    icon = "out";
    title = result.nextShift
      ? t("clock.seeYou", { name: result.name })
      : t("clock.seeYouLater", { name: result.name });
    line = t("clock.clockedOutAt", { time: formatClock(result.at) });

    cards = [
      { label: t("clock.workedToday"), value: formatWorked(result.workedTodayMinutes) },
      result.nextShift
        ? {
            label: t("clock.nextShift"),
            value: `${fromKey(result.nextShift.date).toLocaleDateString(locale, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })} · ${formatMinutes(result.nextShift.startMinutes)}`,
          }
        : null,
    ].filter(Boolean);
  }

  return (
    <Pressable accessibilityRole="button" onPress={onDone} style={styles.result}>
      <View style={[styles.resultIcon, icon === "out" && styles.resultIconOut]}>
        {icon === "out" ? (
          <LogOut size={40} color={colors.warning} strokeWidth={2} />
        ) : (
          <Check size={44} color={colors.onPrimary} strokeWidth={2.5} />
        )}
      </View>
      <Text style={styles.resultTitle}>{title}</Text>
      <Text style={styles.resultLine}>{line}</Text>

      {cards.length ? (
        <View style={styles.resultCards}>
          {cards.map((card) => (
            <View key={card.label} style={styles.resultCard}>
              <Text style={type.caption}>{card.label}</Text>
              <Text style={type.bodyMedium}>{card.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[type.caption, styles.resultCountdown]}>{t("clock.backIn", { seconds })}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },

  barLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 32,
  },

  center: {
    textAlign: "center",
  },

  // Home

  home: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },

  bigClock: {
    fontFamily: fonts.semibold,
    fontSize: 72,
    letterSpacing: -3,
    color: colors.text,
  },

  homeHint: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.xxl,
    textAlign: "center",
  },

  inputBox: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    height: 60,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },

  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 22,
    color: colors.text,
  },

  suggestions: {
    alignSelf: "stretch",
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: "hidden",
  },

  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  suggestionPressed: {
    backgroundColor: colors.primarySoft,
  },

  disabledRow: {
    opacity: 0.45,
  },

  suggestionName: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
  },

  noMatch: {
    padding: spacing.lg,
  },

  counts: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  countChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  countText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },

  createLink: {
    marginTop: spacing.xxl,
    padding: spacing.sm,
  },

  createText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primary,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },

  // Who

  who: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },

  whoTitle: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    color: colors.text,
  },

  // PIN

  split: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 48,
    paddingHorizontal: spacing.xl,
  },

  stack: {
    flexDirection: "column",
    gap: spacing.xl,
    justifyContent: "flex-start",
    paddingTop: spacing.md,
  },

  personPanel: {
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: 300,
  },

  personName: {
    fontFamily: fonts.semibold,
    fontSize: 24,
    color: colors.text,
  },

  steps: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  padPanel: {
    alignItems: "center",
  },

  padTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
  },

  message: {
    marginTop: spacing.md,
    maxWidth: 260,
    textAlign: "center",
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },

  // Selfie

  selfie: {
    flex: 1,
    backgroundColor: "#1E2A27",
  },

  cameraBox: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#2A3632",
  },

  noCamera: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },

  faceGuide: {
    position: "absolute",
    left: "50%",
    top: "42%",
    width: 180,
    height: 236,
    marginLeft: -90,
    marginTop: -118,
    borderRadius: 120,
    borderWidth: 3,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.75)",
  },

  cameraTop: {
    position: "absolute",
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cameraBottomText: {
    position: "absolute",
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  cameraText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#FFFFFF",
  },

  cameraStrong: {
    fontFamily: fonts.semibold,
  },

  cameraBar: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },

  cameraTime: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    color: "#FFFFFF",
  },

  cameraHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#C4DED6",
  },

  shutter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  cameraCancel: {
    minWidth: 120,
    alignItems: "flex-end",
    padding: spacing.sm,
  },

  // Result

  result: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },

  resultIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  resultIconOut: {
    backgroundColor: colors.warningSoft,
  },

  resultTitle: {
    fontFamily: fonts.semibold,
    fontSize: 28,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: "center",
  },

  resultLine: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  resultCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },

  resultCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 2,
  },

  resultCountdown: {
    marginTop: spacing.xl,
  },
});
