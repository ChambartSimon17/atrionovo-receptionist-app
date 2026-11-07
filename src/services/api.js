import {
  saveTokens,
  getRefreshToken,
  clearTokens,
} from "../storage/auth-storage";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL;

// ======================================================
// Auth refresh state
// ======================================================

let refreshPromise = null;

let onTokenRefreshed = null;
let onAuthFailure = null;

// ======================================================
// Auth callbacks
// ======================================================

export function configureAuth({
  tokenRefreshed,
  authFailure,
}) {
  onTokenRefreshed =
    tokenRefreshed;

  onAuthFailure =
    authFailure;
}

// ======================================================
// Basic request
// ======================================================

async function request(
  endpoint,
  options = {}
) {
  const headers = {
    ...options.headers,
  };

  // Alleen Content-Type JSON meesturen
  // wanneer er daadwerkelijk een body is.
  if (options.body !== undefined) {
    headers["Content-Type"] =
      "application/json";
  }

  try {
    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );

    const text = await response.text();

    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const error = new Error(
        data?.message ||
          "Er ging iets mis."
      );

      error.status = response.status;
      error.code = data?.code ?? null;
      error.details = data?.errors ?? [];

      throw error;
    }

    return data;
  } catch (error) {
    if (error.status) {
      throw error;
    }

    throw new Error(
      "Kan geen verbinding maken met de server. Controleer je internetverbinding en probeer opnieuw."
    );
  }
}

// ======================================================
// Refresh access token
// ======================================================

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise =
    (async () => {
      try {
        const refreshToken =
          await getRefreshToken();

        if (!refreshToken) {
          throw new Error(
            "No refresh token available."
          );
        }

        const response =
          await request(
            "/auth/refresh",
            {
              method: "POST",

              body: JSON.stringify({
                refreshToken,
              }),
            }
          );

        const newAccessToken =
          response.data.accessToken;

        const newRefreshToken =
          response.data.refreshToken;

        await saveTokens({
          accessToken:
            newAccessToken,

          refreshToken:
            newRefreshToken,
        });

        if (onTokenRefreshed) {
          onTokenRefreshed(
            newAccessToken
          );
        }

        return newAccessToken;
      } catch (error) {
        await clearTokens();

        if (onAuthFailure) {
          onAuthFailure();
        }

        throw error;
      } finally {
        refreshPromise = null;
      }
    })();

  return refreshPromise;
}

// ======================================================
// Authenticated request
// ======================================================

async function authenticatedRequest(
  endpoint,
  accessToken,
  options = {}
) {
  try {
    return await request(
      endpoint,
      {
        ...options,

        headers: {
          ...options.headers,

          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );
  } catch (error) {
    if (error.status !== 401) {
      throw error;
    }

    const newAccessToken =
      await refreshAccessToken();

    return request(
      endpoint,
      {
        ...options,

        headers: {
          ...options.headers,

          Authorization:
            `Bearer ${newAccessToken}`,
        },
      }
    );
  }
}

// ======================================================
// API
// ======================================================

export const api = {
  // ====================================================
  // Auth
  // ====================================================

  login(credentials) {
    return request(
      "/auth/login",
      {
        method: "POST",

        body: JSON.stringify(
          credentials
        ),
      }
    );
  },

  register(userData) {
    return request(
      "/auth/register",
      {
        method: "POST",

        body: JSON.stringify(
          userData
        ),
      }
    );
  },

  getMe(accessToken) {
    return authenticatedRequest(
      "/auth/me",
      accessToken,
      {
        method: "GET",
      }
    );
  },

  refresh(refreshToken) {
    return request(
      "/auth/refresh",
      {
        method: "POST",

        body: JSON.stringify({
          refreshToken,
        }),
      }
    );
  },

  // ====================================================
  // Business
  // ====================================================

  getMyBusiness(accessToken) {
    return authenticatedRequest(
      "/businesses/me",
      accessToken,
      {
        method: "GET",
      }
    );
  },

  updateMyBusiness(
    businessData,
    accessToken
  ) {
    return authenticatedRequest(
      "/businesses/me",
      accessToken,
      {
        method: "PUT",

        body: JSON.stringify(
          businessData
        ),
      }
    );
  },

  setVoiceAgentEnabled(enabled, accessToken) {
    return authenticatedRequest(
      "/businesses/me",
      accessToken,
      {
        method: "PUT",

        body: JSON.stringify({
          voiceAgentEnabled: enabled,
        }),
      }
    );
  },

  // ====================================================
  // Massage services (MASSAGE businesses only)
  // ====================================================

  getMassageServices(
    businessId,
    accessToken,
    { includeInactive = false } = {}
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/massage-services${
        includeInactive
          ? "?includeInactive=true"
          : ""
      }`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  createMassageService(
    businessId,
    serviceData,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/massage-services`,
      accessToken,
      {
        method: "POST",

        body: JSON.stringify(
          serviceData
        ),
      }
    );
  },

  updateMassageService(
    businessId,
    serviceId,
    serviceData,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/massage-services/${serviceId}`,
      accessToken,
      {
        method: "PATCH",

        body: JSON.stringify(
          serviceData
        ),
      }
    );
  },

  deactivateMassageService(
    businessId,
    serviceId,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/massage-services/${serviceId}`,
      accessToken,
      {
        method: "DELETE",
      }
    );
  },

  // ====================================================
  // Therapists (MASSAGE businesses only)
  // ====================================================

  getTherapists(
    businessId,
    accessToken,
    { includeInactive = false } = {}
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/therapists${
        includeInactive
          ? "?includeInactive=true"
          : ""
      }`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  createTherapist(
    businessId,
    data,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/therapists`,
      accessToken,
      {
        method: "POST",

        body: JSON.stringify(data),
      }
    );
  },

  updateTherapist(
    businessId,
    therapistId,
    data,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/therapists/${therapistId}`,
      accessToken,
      {
        method: "PATCH",

        body: JSON.stringify(data),
      }
    );
  },

  deactivateTherapist(
    businessId,
    therapistId,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/therapists/${therapistId}`,
      accessToken,
      {
        method: "DELETE",
      }
    );
  },

  // ====================================================
  // Treatment rooms (MASSAGE businesses only)
  // ====================================================

  getTreatmentRooms(
    businessId,
    accessToken,
    { includeInactive = false } = {}
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/treatment-rooms${
        includeInactive
          ? "?includeInactive=true"
          : ""
      }`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  createTreatmentRoom(
    businessId,
    data,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/treatment-rooms`,
      accessToken,
      {
        method: "POST",

        body: JSON.stringify(data),
      }
    );
  },

  updateTreatmentRoom(
    businessId,
    roomId,
    data,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/treatment-rooms/${roomId}`,
      accessToken,
      {
        method: "PATCH",

        body: JSON.stringify(data),
      }
    );
  },

  deactivateTreatmentRoom(
    businessId,
    roomId,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/treatment-rooms/${roomId}`,
      accessToken,
      {
        method: "DELETE",
      }
    );
  },

  // ====================================================
  // Massage appointments (MASSAGE businesses only)
  // ====================================================

  getMassageAvailability(
    businessId,
    { date, serviceId },
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/massage-availability?date=${encodeURIComponent(
        date
      )}&serviceId=${encodeURIComponent(serviceId)}`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  getMassageAppointments(
    businessId,
    date,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/appointments?date=${encodeURIComponent(
        date
      )}`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  getMassageAppointmentCountsForMonth(
    businessId,
    year,
    month,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/appointments/month?year=${year}&month=${month}`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  createMassageAppointment(
    businessId,
    appointmentData,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/appointments`,
      accessToken,
      {
        method: "POST",

        body: JSON.stringify(
          appointmentData
        ),
      }
    );
  },

  updateMassageAppointment(
    businessId,
    appointmentId,
    appointmentData,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/appointments/${appointmentId}`,
      accessToken,
      {
        method: "PATCH",

        body: JSON.stringify(
          appointmentData
        ),
      }
    );
  },

  getTables(
    businessId,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/tables`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  createTable(
    businessId,
    table,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/tables`,
      accessToken,
      {
        method: "POST",

        body: JSON.stringify(
          table
        ),
      }
    );
  },

  updateTable(
    businessId,
    tableId,
    table,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/tables/${tableId}`,
      accessToken,
      {
        method: "PATCH",

        body: JSON.stringify(
          table
        ),
      }
    );
  },

  deleteTable(
    businessId,
    tableId,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/tables/${tableId}`,
      accessToken,
      {
        method: "DELETE",
      }
    );
  },

  getOpeningHours(
    businessId,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/opening-hours`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  updateOpeningHours(
    businessId,
    openingHours,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/opening-hours`,
      accessToken,
      {
        method: "PUT",

        body: JSON.stringify({
          openingHours,
        }),
      }
    );
  },

  getSpecialOpeningDays(
    businessId,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/special-opening-days`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  createSpecialOpeningDay(
    businessId,
    data,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/special-opening-days`,
      accessToken,
      {
        method: "POST",

        body: JSON.stringify(
          data
        ),
      }
    );
  },

  updateSpecialOpeningDay(
    businessId,
    id,
    data,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/special-opening-days/${id}`,
      accessToken,
      {
        method: "PUT",

        body: JSON.stringify(
          data
        ),
      }
    );
  },

  deleteSpecialOpeningDay(
    businessId,
    id,
    accessToken
  ) {
    return authenticatedRequest(
      `/businesses/${businessId}/special-opening-days/${id}`,
      accessToken,
      {
        method: "DELETE",
      }
    );
  },

  // ====================================================
  // Customers
  // ====================================================

  getCustomers(accessToken) {
    return authenticatedRequest(
      "/customers",
      accessToken,
      {
        method: "GET",
      }
    );
  },

  createCustomer(
    customer,
    accessToken
  ) {
    return authenticatedRequest(
      "/customers",
      accessToken,
      {
        method: "POST",

        body: JSON.stringify(
          customer
        ),
      }
    );
  },

  getCustomer(
    id,
    accessToken
  ) {
    return authenticatedRequest(
      `/customers/${id}`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  searchCustomers(
    query,
    accessToken
  ) {
    return authenticatedRequest(
      `/customers/search-by-name?query=${encodeURIComponent(
        query
      )}`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  // ====================================================
  // Reservations
  // ====================================================

  checkAvailability(
    businessId,
    guestCount,
    startTime,
    endTime
  ) {
    return request(
      "/reservations/check-availability",
      {
        method: "POST",
        headers: {
          "x-business-id": businessId,
        },
        body: JSON.stringify({
          guestCount,
          startTime,
          endTime,
        }),
      }
    );
  },

  getReservations(accessToken) {
    return authenticatedRequest(
      "/reservations",
      accessToken,
      {
        method: "GET",
      }
    );
  },

  getReservation(
    id,
    accessToken
  ) {
    return authenticatedRequest(
      `/reservations/${id}`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  getReservationsForDay(
    date,
    accessToken
  ) {
    return authenticatedRequest(
      `/reservations/day?date=${encodeURIComponent(
        date
      )}`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  getReservationCountsForMonth(
    year,
    month,
    accessToken
  ) {
    return authenticatedRequest(
      `/reservations/month?year=${year}&month=${month}`,
      accessToken,
      {
        method: "GET",
      }
    );
  },

  cancelReservation(
    reservationId,
    accessToken
  ) {
    return authenticatedRequest(
      `/reservations/${reservationId}/cancel`,
      accessToken,
      {
        method: "POST",
      }
    );
  },

  markReservationAsSeated(
    businessId,
    reservationId,
    accessToken
  ) {
    return authenticatedRequest(
      `/reservations/${businessId}/${reservationId}/seat`,
      accessToken,
      {
        method: "PATCH",
      }
    );
  },

  markReservationAsCompleted(
    businessId,
    reservationId,
    accessToken
  ) {
    return authenticatedRequest(
      `/reservations/${businessId}/${reservationId}/complete`,
      accessToken,
      {
        method: "PATCH",
      }
    );
  },

  updateReservation(
    reservationId,
    reservation,
    accessToken
  ) {
    return authenticatedRequest(
      `/reservations/${reservationId}`,
      accessToken,
      {
        method: "PUT",

        body: JSON.stringify(
          reservation
        ),
      }
    );
  },

  rescheduleReservation(
    reservationId,
    startTime,
    accessToken
  ) {
    return authenticatedRequest(
      `/reservations/${reservationId}/reschedule`,
      accessToken,
      {
        method: "POST",

        body: JSON.stringify({
          startTime,
        }),
      }
    );
  },

  createReservation(
    reservation,
    accessToken
  ) {
    return authenticatedRequest(
      "/reservations",
      accessToken,
      {
        method: "POST",

        body: JSON.stringify(
          reservation
        ),
      }
    );
  },

  // Every reservation of a day, also completed,
  // cancelled and no-show ones.
  getAllReservationsForDay(date, accessToken) {
    return authenticatedRequest(
      `/reservations/day?all=true&date=${encodeURIComponent(date)}`,
      accessToken,
      { method: "GET" }
    );
  },

  markReservationAsNoShow(businessId, reservationId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/reservations/${reservationId}/no-show`,
      accessToken,
      { method: "PATCH" }
    );
  },

  undoReservationStatus(businessId, reservationId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/reservations/${reservationId}/undo`,
      accessToken,
      { method: "PATCH" }
    );
  },

  moveReservationToTables(businessId, reservationId, tableIds, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/reservations/${reservationId}/tables`,
      accessToken,
      {
        method: "PUT",
        body: JSON.stringify({ tableIds }),
      }
    );
  },

  createWalkIn(businessId, walkIn, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/walk-ins`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify(walkIn),
      }
    );
  },

  // ====================================================
  // Floor plan
  // ====================================================

  getFloorPlan(businessId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/floor-plan`,
      accessToken,
      { method: "GET" }
    );
  },

  saveFloorPlan(businessId, plan, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/floor-plan`,
      accessToken,
      {
        method: "PUT",
        body: JSON.stringify(plan),
      }
    );
  },

  // ====================================================
  // Insights
  // ====================================================

  getGuestHistory(businessId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/guest-history`,
      accessToken,
      { method: "GET" }
    );
  },

  getCalls(businessId, { from, to, limit } = {}, accessToken) {
    const query = new URLSearchParams();

    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (limit) query.set("limit", String(limit));

    return authenticatedRequest(
      `/businesses/${businessId}/calls?${query.toString()}`,
      accessToken,
      { method: "GET" }
    );
  },

  getCall(businessId, callId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/calls/${callId}`,
      accessToken,
      { method: "GET" }
    );
  },

  setCallHandled(businessId, callId, handled, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/calls/${callId}`,
      accessToken,
      {
        method: "PATCH",
        body: JSON.stringify({ handled }),
      }
    );
  },

  getAiStats(businessId, { from, to }, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/ai-stats?from=${encodeURIComponent(
        from
      )}&to=${encodeURIComponent(to)}`,
      accessToken,
      { method: "GET" }
    );
  },

  registerPushToken(token, accessToken) {
    return authenticatedRequest("/auth/push-tokens", accessToken, {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  removePushToken(token, accessToken) {
    return authenticatedRequest("/auth/push-tokens", accessToken, {
      method: "DELETE",
      body: JSON.stringify({ token }),
    });
  },

  // ====================================================
  // Team (salon): schedule, absences, time clock
  // ====================================================

  getTeamSchedule(businessId, from, days, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/schedule?from=${from}&days=${days}`,
      accessToken,
      { method: "GET" }
    );
  },

  getTeamTherapist(businessId, therapistId, today, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/therapists/${therapistId}?today=${today}`,
      accessToken,
      { method: "GET" }
    );
  },

  setScheduleDay(businessId, therapistId, date, periods, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/therapists/${therapistId}/days/${date}`,
      accessToken,
      { method: "PUT", body: JSON.stringify({ periods }) }
    );
  },

  clearScheduleDay(businessId, therapistId, date, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/therapists/${therapistId}/days/${date}`,
      accessToken,
      { method: "DELETE" }
    );
  },

  createAbsence(businessId, absence, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/absences`,
      accessToken,
      { method: "POST", body: JSON.stringify(absence) }
    );
  },

  updateAbsence(businessId, absenceId, changes, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/absences/${absenceId}`,
      accessToken,
      { method: "PATCH", body: JSON.stringify(changes) }
    );
  },

  deleteAbsence(businessId, absenceId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/absences/${absenceId}`,
      accessToken,
      { method: "DELETE" }
    );
  },

  getAbsence(businessId, absenceId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/absences/${absenceId}`,
      accessToken,
      { method: "GET" }
    );
  },

  reassignAppointment(businessId, appointmentId, therapistId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/appointments/${appointmentId}/reassign`,
      accessToken,
      { method: "POST", body: JSON.stringify({ therapistId }) }
    );
  },

  getClockStaff(businessId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/clock`,
      accessToken,
      { method: "GET" }
    );
  },

  createClockPin(businessId, therapistId, pin, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/clock/pin`,
      accessToken,
      { method: "POST", body: JSON.stringify({ therapistId, pin }) }
    );
  },

  verifyClockPin(businessId, therapistId, pin, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/clock/verify`,
      accessToken,
      { method: "POST", body: JSON.stringify({ therapistId, pin }) }
    );
  },

  punchClock(businessId, therapistId, pin, photo, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/clock/punch`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ therapistId, pin, photo }),
      }
    );
  },

  resetClockPin(businessId, therapistId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/therapists/${therapistId}/pin`,
      accessToken,
      { method: "DELETE" }
    );
  },

  getAttendance(businessId, date, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/attendance?date=${date}`,
      accessToken,
      { method: "GET" }
    );
  },

  getAttendanceSummary(businessId, from, to, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/attendance/summary?from=${from}&to=${to}`,
      accessToken,
      { method: "GET" }
    );
  },

  /**
   * The CSV text of the shifts in [from, to].
   */
  async getAttendanceCsv(businessId, from, to, accessToken) {
    const response = await fetch(
      `${API_URL}/businesses/${businessId}/team/attendance/export?from=${from}&to=${to}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      throw new Error("Er ging iets mis.");
    }

    return response.text();
  },

  /**
   * Image source of a clock photo (in or out).
   */
  clockPhotoSource(businessId, entryId, kind, accessToken) {
    return {
      uri: `${API_URL}/businesses/${businessId}/team/time-entries/${entryId}/photo/${kind}`,
      headers: { Authorization: `Bearer ${accessToken}` },
    };
  },

  addTimeEntry(businessId, entry, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/time-entries`,
      accessToken,
      { method: "POST", body: JSON.stringify(entry) }
    );
  },

  updateTimeEntry(businessId, entryId, changes, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/time-entries/${entryId}`,
      accessToken,
      { method: "PATCH", body: JSON.stringify(changes) }
    );
  },

  deleteTimeEntry(businessId, entryId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/team/time-entries/${entryId}`,
      accessToken,
      { method: "DELETE" }
    );
  },

  // ====================================================
  // Payments
  // ====================================================

  getStripeStatus(businessId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/payments/stripe`,
      accessToken,
      { method: "GET" }
    );
  },

  getStripeOnboardingLink(businessId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/payments/stripe/onboarding`,
      accessToken,
      { method: "POST", body: JSON.stringify({}) }
    );
  },

  createPayment(businessId, payment, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/payments`,
      accessToken,
      { method: "POST", body: JSON.stringify(payment) }
    );
  },

  getPayment(businessId, paymentId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/payments/${paymentId}`,
      accessToken,
      { method: "GET" }
    );
  },

  cancelPayment(businessId, paymentId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/payments/${paymentId}/cancel`,
      accessToken,
      { method: "POST", body: JSON.stringify({}) }
    );
  },

  getPaymentSummary(businessId, date, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/payments/summary?date=${date}`,
      accessToken,
      { method: "GET" }
    );
  },

  // ====================================================
  // Invoicing: kastickets, facturen, creditnota's
  // ====================================================

  getInvoicing(businessId, accessToken) {
    return authenticatedRequest(`/businesses/${businessId}/invoicing`, accessToken, {
      method: "GET",
    });
  },

  updateInvoicing(businessId, settings, accessToken) {
    return authenticatedRequest(`/businesses/${businessId}/invoicing`, accessToken, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },

  lookupVat(businessId, number, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/vat-lookup?number=${encodeURIComponent(number)}`,
      accessToken,
      { method: "GET" }
    );
  },

  issueDocument(businessId, paymentId, document, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/payments/${paymentId}/documents`,
      accessToken,
      { method: "POST", body: JSON.stringify(document) }
    );
  },

  getDocuments(businessId, { month, kind }, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/documents?month=${month}${kind ? `&kind=${kind}` : ""}`,
      accessToken,
      { method: "GET" }
    );
  },

  emailDocument(businessId, documentId, email, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/documents/${documentId}/email`,
      accessToken,
      { method: "POST", body: JSON.stringify({ email }) }
    );
  },

  convertDocument(businessId, documentId, data, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/documents/${documentId}/convert`,
      accessToken,
      { method: "POST", body: JSON.stringify(data) }
    );
  },

  creditDocument(businessId, documentId, accessToken) {
    return authenticatedRequest(
      `/businesses/${businessId}/documents/${documentId}/credit`,
      accessToken,
      { method: "POST", body: JSON.stringify({}) }
    );
  },

  /**
   * Downloads a file of the business (a PDF, a CSV) with
   * the access token and returns its bytes.
   */
  async downloadBusinessFile(businessId, path, accessToken) {
    const response = await fetch(`${API_URL}/businesses/${businessId}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Er ging iets mis.");
    }

    return new Uint8Array(await response.arrayBuffer());
  },
};
