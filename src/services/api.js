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
  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,

      headers: {
        "Content-Type":
          "application/json",

        ...options.headers,
      },
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    const error = new Error(
      data?.error?.message ||
        "Something went wrong."
    );

    error.status =
      response.status;

    throw error;
  }

  return data;
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
  // Reservations
  // ====================================================

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
};