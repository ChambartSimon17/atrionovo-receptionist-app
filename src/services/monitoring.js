import * as Sentry from "@sentry/react-native";

// ======================================================
// Error tracking (Sentry)
// ======================================================
//
// Crashes and unexpected errors are sent to Sentry, so
// they are seen before a customer reports them. Only
// active when EXPO_PUBLIC_SENTRY_DSN is set (in
// .env.local or the EAS build profile); without it the
// app runs exactly as before.
//
// No personal data: Sentry gets the business id and the
// business type, never names, phone numbers or e-mail.
// ======================================================

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const isMonitoringEnabled = Boolean(dsn);

if (isMonitoringEnabled) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    environment: __DEV__ ? "development" : "production",
    tracesSampleRate: 0.1,
    enabled: !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_IN_DEV === "true",
  });
}

export function setMonitoringBusiness(business) {
  if (!isMonitoringEnabled) {
    return;
  }

  Sentry.setUser(business ? { id: business.id } : null);
  Sentry.setTag("businessType", business?.businessType ?? "none");
}

export function reportError(error, context) {
  if (isMonitoringEnabled) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }
}

/**
 * Wraps the root component so render crashes are caught.
 */
export function withMonitoring(Component) {
  return isMonitoringEnabled ? Sentry.wrap(Component) : Component;
}
