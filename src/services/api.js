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
};