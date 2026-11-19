import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CalendarDays, Link2 } from "lucide-react-native";

import { api } from "../../services/api";
import { useAuth } from "../../context/auth-context";
import { colors, fonts, radius, spacing } from "../../theme";
import { settingsStyles } from "../../theme/settingsStyles";
import { useEmbedded } from "../../components/embedded";
import { Chip, SettingsGroup, SettingsRow, Stepper, Switch } from "../../components/ui";

// ======================================================
// Integraties
// ======================================================
//
// The owner connects their own calendars, so that busy
// time there is never booked by the AI receptionist or
// the website:
//
// - Apple-agenda: Apple ID + app-specific password. Pick
//   which calendars count as busy, and the one new
//   appointments are written into.
// - Agenda-link: an ICS / webcal link (Setmore and
//   others), read only.
//
// Nothing is connected for a new business. The password
// and the link are sent once and never shown again.
// ======================================================

const APPLE_ACCOUNT_URL = "https://account.apple.com";

// What went wrong, in words the owner can act on.
const FAILURE_TEXT = {
  LOGIN_REFUSED:
    "Apple weigert de login. Controleer je Apple ID en gebruik een app-specifiek wachtwoord, niet je gewone wachtwoord.",
  TIMEOUT: "De agenda reageert niet. Probeer het zo meteen opnieuw.",
  NOT_A_CALENDAR: "Deze link is geen agenda. Kopieer de agenda-link (iCal / webcal) opnieuw.",
  INVALID_LINK: "Gebruik de https- of webcal-link van de agenda.",
  CALENDAR_GONE: "Een gekozen agenda bestaat niet meer in dit account.",
  UNREACHABLE: "De agenda is niet bereikbaar. Controleer de gegevens en probeer opnieuw.",
};

function errorText(error, fallback) {
  const reason = error?.details?.[0]?.reason;

  return FAILURE_TEXT[reason] ?? error?.message ?? fallback;
}

function syncText(calendar) {
  if (calendar.lastError) {
    return `Probleem: ${calendar.lastError}`;
  }

  if (!calendar.lastSyncAt) {
    return "Nog niet gesynchroniseerd";
  }

  const time = new Date(calendar.lastSyncAt).toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const blocks =
    calendar.blockCount === 1 ? "1 bezet moment" : `${calendar.blockCount} bezette momenten`;

  return `Bijgewerkt om ${time} · ${blocks}`;
}

const EMPTY_LOGIN = { username: "", password: "" };
const EMPTY_LINK = { source: null, name: "", url: "", travelMinutes: 0 };

// Where each booking system keeps its calendar link
// (iCal / ICS). Systems without such a link can still be
// used through Google Agenda when they sync with it.
const LINK_SOURCES = [
  {
    id: "setmore",
    label: "Setmore",
    steps:
      "In Setmore: Settings → Your profile → Integrations. Klik naast Link your calendar op Get link en daarna Copy link. Mogelijk alleen bij een betalend plan.",
  },
  {
    id: "salonized",
    label: "Salonized",
    steps:
      "In Salonized: het tandwiel linksonder → Agenda-instellingen → Deel je agenda met externe programma's. Kopieer de link.",
  },
  {
    id: "fresha",
    label: "Fresha",
    steps:
      "In Fresha: Agenda → instellingen → Agenda synchroniseren → Andere agenda (Apple of Outlook). Kopieer de agenda-link.",
  },
  {
    id: "acuity",
    label: "Acuity",
    steps:
      "In Acuity Scheduling: Sync with Other Calendars → 1-way Calendar Sync. Kopieer de link onderaan de pagina.",
  },
  {
    id: "google",
    label: "Google Agenda",
    steps:
      "Op de computer in Google Agenda: ⋮ naast de agenda → Instellingen en delen → Agenda integreren. Kopieer het Geheim adres in iCal-indeling. Google werkt deze link maar om de paar uur bij.",
  },
  {
    id: "outlook",
    label: "Outlook",
    steps:
      "In Outlook op het web: Instellingen → Agenda → Gedeelde agenda's → Een agenda publiceren. Kies de agenda, publiceer en kopieer de ICS-link.",
  },
  {
    id: "other",
    label: "Ander systeem",
    steps:
      "Zoek in de instellingen naar iCal, ICS, webcal of agenda delen/synchroniseren. Square, SimplyBook.me en Booksy hebben geen eigen link maar kunnen naar Google Agenda synchroniseren: koppel dan die Google-agenda. Treatwell kan zijn agenda niet delen.",
  },
];

export default function IntegrationsScreen() {
  const embedded = useEmbedded();
  const { accessToken, business, user } = useAuth();

  const businessId = business?.id;
  const canEdit = !user?.role || user.role === "OWNER" || user.role === "MANAGER";

  const [connections, setConnections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  // null: overview. "icloud": login form. "pick": choose
  // calendars of an iCloud account. "link": add an ICS link.
  const [mode, setMode] = useState(null);
  const [login, setLogin] = useState(EMPTY_LOGIN);
  const [link, setLink] = useState(EMPTY_LINK);
  const [picking, setPicking] = useState(null);

  const load = useCallback(async () => {
    // Still logging in (opened from a link at start-up).
    if (!businessId || !accessToken) {
      return;
    }

    try {
      const response = await api.getCalendarIntegrations(businessId, accessToken);
      setConnections(response.data);
    } catch (error) {
      Alert.alert("Fout", error.message || "De integraties konden niet worden geladen.");
    } finally {
      setIsLoading(false);
    }
  }, [businessId, accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action, fallback) {
    try {
      setIsBusy(true);
      return await action();
    } catch (error) {
      Alert.alert("Dat lukte niet", errorText(error, fallback));
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  function close() {
    setMode(null);
    setLogin(EMPTY_LOGIN);
    setLink(EMPTY_LINK);
    setPicking(null);
  }

  function startPicking(connectionId, calendars) {
    const write = calendars.find((calendar) => calendar.write);

    setPicking({
      connectionId,
      writeUrl: write?.remoteUrl ?? null,
      calendars: calendars.map((calendar) => ({ ...calendar })),
    });
    setMode("pick");
  }

  async function connectIcloud() {
    const username = login.username.trim();
    const password = login.password.trim();

    if (!username || !password) {
      Alert.alert("Controleer je invoer", "Vul je Apple ID en het app-specifieke wachtwoord in.");
      return;
    }

    const response = await run(
      () => api.connectIcloudCalendar(businessId, { username, password }, accessToken),
      "De Apple-agenda kon niet worden gekoppeld."
    );

    if (response) {
      setLogin(EMPTY_LOGIN);
      startPicking(response.data.connectionId, response.data.calendars);
    }
  }

  async function openPicker(connection) {
    const response = await run(
      () => api.getIcloudCalendars(businessId, connection.id, accessToken),
      "De agenda's konden niet worden geladen."
    );

    if (response) {
      startPicking(connection.id, response.data);
    }
  }

  function updatePicked(remoteUrl, changes) {
    setPicking((current) => ({
      ...current,
      calendars: current.calendars.map((calendar) =>
        calendar.remoteUrl === remoteUrl ? { ...calendar, ...changes } : calendar
      ),
    }));
  }

  function chooseWrite(remoteUrl) {
    setPicking((current) => ({
      ...current,
      writeUrl: current.writeUrl === remoteUrl ? null : remoteUrl,
      // The calendar for new appointments is always read.
      calendars: current.calendars.map((calendar) =>
        calendar.remoteUrl === remoteUrl ? { ...calendar, read: true } : calendar
      ),
    }));
  }

  async function savePicked() {
    const data = {
      writeUrl: picking.writeUrl,
      calendars: picking.calendars.map((calendar) => ({
        remoteUrl: calendar.remoteUrl,
        read: calendar.read || calendar.remoteUrl === picking.writeUrl,
        travelMinutes: calendar.travelMinutes ?? 0,
      })),
    };

    const response = await run(
      () => api.saveIcloudCalendars(businessId, picking.connectionId, data, accessToken),
      "De keuze kon niet worden opgeslagen."
    );

    if (response) {
      setConnections(response.data);
      close();
    }
  }

  async function addLink() {
    const name = link.name.trim();
    const url = link.url.trim();

    if (!name || !url) {
      Alert.alert("Controleer je invoer", "Vul een naam en de agenda-link in.");
      return;
    }

    const response = await run(
      () =>
        api.connectIcsCalendar(
          businessId,
          { name, url, travelMinutes: link.travelMinutes },
          accessToken
        ),
      "De agenda-link kon niet worden toegevoegd."
    );

    if (response) {
      setConnections(response.data);
      close();
    }
  }

  async function updateCalendar(calendar, changes) {
    const response = await run(
      () => api.updateExternalCalendar(businessId, calendar.id, changes, accessToken),
      "De wijziging kon niet worden opgeslagen."
    );

    if (response) {
      setConnections(response.data);
    }
  }

  async function syncNow() {
    const response = await run(
      () => api.syncCalendarIntegrations(businessId, accessToken),
      "Synchroniseren is niet gelukt."
    );

    if (response) {
      setConnections(response.data);
    }
  }

  function confirmDisconnect(connection) {
    const what =
      connection.provider === "ICLOUD_CALDAV"
        ? `de Apple-agenda van ${connection.username}`
        : `"${connection.calendars[0]?.displayName ?? "deze agenda"}"`;

    Alert.alert(
      "Ontkoppelen?",
      `Je ontkoppelt ${what}. Bezette momenten daaruit tellen niet meer mee. Afspraken die al in je Apple-agenda staan, blijven daar staan.`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Ontkoppelen",
          style: "destructive",
          onPress: async () => {
            const response = await run(
              () => api.disconnectCalendar(businessId, connection.id, accessToken),
              "Ontkoppelen is niet gelukt."
            );

            if (response) {
              setConnections(response.data);
            }
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const icloud = connections.filter((connection) => connection.provider === "ICLOUD_CALDAV");
  const links = connections.filter((connection) => connection.provider === "ICS_FEED");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, embedded && styles.fill]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Integraties</Text>

        <Text style={styles.description}>
          Koppel je eigen agenda's. Wat daar gepland staat, telt als bezet: de AI-receptie en de
          website boeken er nooit overheen. Nieuwe afspraken kunnen ook in je Apple-agenda komen.
        </Text>

        {!canEdit ? (
          <Text style={styles.empty}>Alleen de eigenaar kan integraties beheren.</Text>
        ) : null}

        {canEdit && mode === "icloud" ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Apple-agenda koppelen</Text>

            <Text style={styles.steps}>
              1. Ga naar account.apple.com en log in.{"\n"}
              2. Kies Inloggen en beveiliging → App-specifieke wachtwoorden.{"\n"}
              3. Maak een wachtwoord aan, bijvoorbeeld met de naam AtrioNovo.{"\n"}
              4. Vul hieronder je Apple ID en dat wachtwoord in.
            </Text>

            <Pressable onPress={() => Linking.openURL(APPLE_ACCOUNT_URL)}>
              <Text style={styles.link}>account.apple.com openen</Text>
            </Pressable>

            <Text style={[styles.label, styles.spaced]}>Apple ID</Text>
            <TextInput
              style={styles.input}
              value={login.username}
              onChangeText={(username) => setLogin({ ...login, username })}
              placeholder="naam@icloud.com"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
            />

            <Text style={[styles.label, styles.spaced]}>App-specifiek wachtwoord</Text>
            <TextInput
              style={styles.input}
              value={login.password}
              onChangeText={(password) => setLogin({ ...login, password })}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              textContentType="none"
            />

            <Text style={styles.hint}>
              Niet je gewone Apple-wachtwoord. Het wordt versleuteld bewaard en je kan het altijd
              intrekken op account.apple.com.
            </Text>

            <FormButtons
              busy={isBusy}
              onCancel={close}
              onSave={connectIcloud}
              saveLabel="Verbinden"
            />
          </View>
        ) : null}

        {canEdit && mode === "pick" && picking ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Kies je agenda's</Text>

            <Text style={styles.hint}>
              Zet aan welke agenda's als bezet tellen. Kies er één waarin nieuwe afspraken komen.
              Reistijd blokkeert ook de tijd ervoor en erna.
            </Text>

            {picking.calendars.length === 0 ? (
              <Text style={styles.empty}>Dit account heeft geen agenda's.</Text>
            ) : null}

            {picking.calendars.map((calendar) => {
              const isWrite = picking.writeUrl === calendar.remoteUrl;
              const isRead = calendar.read || isWrite;

              return (
                <View key={calendar.remoteUrl} style={styles.pickCard}>
                  <View style={styles.pickHeader}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {calendar.displayName}
                    </Text>
                    <Switch
                      value={isRead}
                      disabled={isWrite}
                      onValueChange={(read) => updatePicked(calendar.remoteUrl, { read })}
                    />
                  </View>

                  <Text style={styles.cardMeta}>
                    {isRead ? "Telt als bezet" : "Wordt niet gebruikt"}
                  </Text>

                  {isRead ? (
                    <>
                      <View style={styles.pickRow}>
                        <Text style={styles.pickLabel}>Reistijd</Text>
                        <Stepper
                          value={calendar.travelMinutes ?? 0}
                          onChange={(travelMinutes) =>
                            updatePicked(calendar.remoteUrl, { travelMinutes })
                          }
                          min={0}
                          max={120}
                          step={5}
                          suffix="min"
                        />
                      </View>

                      <Pressable
                        style={[styles.writeChoice, isWrite && styles.writeChoiceOn]}
                        onPress={() => chooseWrite(calendar.remoteUrl)}
                      >
                        <View style={[styles.radio, isWrite && styles.radioOn]} />
                        <Text style={[styles.writeText, isWrite && styles.writeTextOn]}>
                          Nieuwe afspraken hierin zetten
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              );
            })}

            <FormButtons busy={isBusy} onCancel={close} onSave={savePicked} saveLabel="Opslaan" />
          </View>
        ) : null}

        {canEdit && mode === "link" ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Agenda-link toevoegen</Text>

            <Text style={styles.hint}>
              Afspraken uit deze agenda tellen als bezet. Kies waar de agenda vandaan komt:
            </Text>

            <View style={styles.chips}>
              {LINK_SOURCES.map((source) => (
                <Chip
                  key={source.id}
                  label={source.label}
                  selected={link.source === source.id}
                  onPress={() =>
                    setLink({
                      ...link,
                      source: source.id,
                      // Suggest a name, unless one was typed.
                      name:
                        !link.name || LINK_SOURCES.some((item) => item.label === link.name)
                          ? source.id === "other"
                            ? ""
                            : source.label
                          : link.name,
                    })
                  }
                />
              ))}
            </View>

            {link.source ? (
              <View style={styles.guide}>
                <Text style={styles.guideText}>
                  {LINK_SOURCES.find((source) => source.id === link.source)?.steps}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.label, styles.spaced]}>Naam</Text>
            <TextInput
              style={styles.input}
              value={link.name}
              onChangeText={(name) => setLink({ ...link, name })}
              placeholder="Bijvoorbeeld The Bridge Lanaken"
              placeholderTextColor={colors.textDisabled}
            />

            <Text style={[styles.label, styles.spaced]}>Agenda-link</Text>
            <TextInput
              style={styles.input}
              value={link.url}
              onChangeText={(url) => setLink({ ...link, url })}
              placeholder="webcal://..."
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={[styles.pickRow, styles.spaced]}>
              <Text style={styles.pickLabel}>Reistijd</Text>
              <Stepper
                value={link.travelMinutes}
                onChange={(travelMinutes) => setLink({ ...link, travelMinutes })}
                min={0}
                max={120}
                step={5}
                suffix="min"
              />
            </View>

            <Text style={styles.hint}>
              De link wordt versleuteld bewaard en daarna niet meer getoond.
            </Text>

            <FormButtons busy={isBusy} onCancel={close} onSave={addLink} saveLabel="Toevoegen" />
          </View>
        ) : null}

        {canEdit && mode === null ? (
          <>
            <View style={styles.actions}>
              <ActionButton
                icon={CalendarDays}
                label="Apple-agenda koppelen"
                onPress={() => setMode("icloud")}
              />
              <ActionButton
                icon={Link2}
                label="Agenda-link toevoegen"
                hint="Setmore, Salonized, Fresha, Google, Outlook..."
                onPress={() => setMode("link")}
              />
            </View>

            {isBusy ? (
              <View style={styles.busy}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.cardMeta}>Bezig met je agenda...</Text>
              </View>
            ) : null}

            {connections.length === 0 && !isBusy ? (
              <Text style={styles.empty}>Er is nog geen agenda gekoppeld.</Text>
            ) : null}

            {icloud.map((connection) => (
              <SettingsGroup
                key={connection.id}
                label={`Apple-agenda · ${connection.username}`}
                style={styles.group}
                footer={
                  connection.calendars.length === 0
                    ? "Er is nog geen agenda gekozen."
                    : undefined
                }
              >
                {connection.calendars.map((calendar) => (
                  <SettingsRow
                    key={calendar.id}
                    label={calendar.displayName}
                    hint={[
                      calendar.isWriteTarget ? "Nieuwe afspraken komen hierin" : "Telt als bezet",
                      calendar.travelMinutes ? `${calendar.travelMinutes} min reistijd` : null,
                      syncText(calendar),
                    ]
                      .filter(Boolean)
                      .join("\n")}
                  />
                ))}
                <SettingsRow label="Agenda's kiezen" onPress={() => openPicker(connection)} />
                <SettingsRow
                  label="Ontkoppelen"
                  danger
                  onPress={() => confirmDisconnect(connection)}
                />
              </SettingsGroup>
            ))}

            {links.map((connection) => {
              const calendar = connection.calendars[0];

              if (!calendar) {
                return null;
              }

              return (
                <SettingsGroup
                  key={connection.id}
                  label="Agenda-link"
                  style={styles.group}
                >
                  <SettingsRow
                    label={calendar.displayName}
                    hint={calendar.isActive ? syncText(calendar) : "Uitgeschakeld"}
                  >
                    <Switch
                      value={calendar.isActive}
                      disabled={isBusy}
                      onValueChange={(isActive) => updateCalendar(calendar, { isActive })}
                    />
                  </SettingsRow>
                  <SettingsRow label="Reistijd">
                    <Stepper
                      value={calendar.travelMinutes}
                      onChange={(travelMinutes) => updateCalendar(calendar, { travelMinutes })}
                      min={0}
                      max={120}
                      step={5}
                      suffix="min"
                    />
                  </SettingsRow>
                  <SettingsRow
                    label="Ontkoppelen"
                    danger
                    onPress={() => confirmDisconnect(connection)}
                  />
                </SettingsGroup>
              );
            })}

            {connections.length > 0 ? (
              <Pressable style={styles.syncButton} onPress={syncNow} disabled={isBusy}>
                {isBusy ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.link}>Nu bijwerken</Text>
                )}
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ActionButton({ icon: Icon, label, hint, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
    >
      <View style={styles.actionIcon}>
        <Icon size={18} color={colors.primary} strokeWidth={1.8} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        {hint ? <Text style={styles.cardMeta}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

function FormButtons({ busy, onCancel, onSave, saveLabel }) {
  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.button, styles.secondaryButton]}
        onPress={onCancel}
        disabled={busy}
      >
        <Text style={styles.secondaryText}>Annuleren</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.primaryButton, busy && styles.disabled]}
        onPress={onSave}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>{saveLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ...settingsStyles,

  fill: {
    maxWidth: "100%",
  },

  row: {
    ...settingsStyles.row,
    marginTop: spacing.xl,
  },

  spaced: {
    marginTop: spacing.lg,
  },

  steps: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  hint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  actions: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },

  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  actionPressed: {
    opacity: 0.7,
  },

  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },

  actionText: {
    flex: 1,
  },

  actionLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },

  group: {
    marginBottom: spacing.xl,
  },

  pickCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },

  pickHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },

  pickLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },

  writeChoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  writeChoiceOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textDisabled,
  },

  radioOn: {
    borderColor: colors.primary,
    borderWidth: 6,
  },

  writeText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },

  writeTextOn: {
    fontFamily: fonts.medium,
    color: colors.primary,
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  guide: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  guideText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },

  busy: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  syncButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
});
