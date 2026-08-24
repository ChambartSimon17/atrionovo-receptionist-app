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
//
// When multiple API requests receive a 401 at the same
// time, they should all wait for the same refresh request.
//
// This prevents multiple refresh requests from happening
// simultaneously.
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
      headers: {
        "Content-Type":
          "application/json",
        ...options.headers,
      },
      ...options,
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
  // If another request is already refreshing,
  // wait for that same refresh request.
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

        // Tell AuthContext about the
        // new access token.
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
    // Only refresh when the backend
    // explicitly tells us the access
    // token is unauthorized.
    if (error.status !== 401) {
      throw error;
    }

    const newAccessToken =
      await refreshAccessToken();

    // Retry the ORIGINAL request
    // with the new access token.
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
};