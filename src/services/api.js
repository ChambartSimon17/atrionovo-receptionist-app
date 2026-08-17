const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Something went wrong."
    );
  }

  return data;
}

export const api = {
  login(credentials) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  register(userData) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  getMe(accessToken) {
    return request("/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },

  refresh(refreshToken) {
    return request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({
        refreshToken,
      }),
    });
  },
};