import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  api,
  configureAuth,
} from "../services/api";

import {
  saveTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
} from "../storage/auth-storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] =
    useState(null);

  const [accessToken, setAccessToken] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const isAuthenticated =
    !!accessToken && !!user;

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    configureAuth({
      tokenRefreshed: (
        newAccessToken
      ) => {
        setAccessToken(
          newAccessToken
        );
      },

      authFailure: async () => {
        await clearTokens();

        setAccessToken(null);
        setUser(null);
        setRestaurant(null);
      },
    });
  }, []);

  async function restoreSession() {
    try {
      const storedAccessToken =
        await getAccessToken();

      if (!storedAccessToken) {
        return;
      }

      try {
        const response =
          await api.getMe(
            storedAccessToken
          );

        setAccessToken(
          storedAccessToken
        );

        setUser(
          response.data.user
        );

        setRestaurant(
          response.data.restaurant
        );

        return;
      } catch {
        // Access token may have expired.
        // Try the refresh token below.
      }

      const storedRefreshToken =
        await getRefreshToken();

      if (!storedRefreshToken) {
        await clearTokens();
        return;
      }

      const refreshResponse =
        await api.refresh(
          storedRefreshToken
        );

      const newAccessToken =
        refreshResponse.data.accessToken;

      const newRefreshToken =
        refreshResponse.data.refreshToken;

      await saveTokens({
        accessToken:
          newAccessToken,
        refreshToken:
          newRefreshToken,
      });

      const meResponse =
        await api.getMe(
          newAccessToken
        );

      setAccessToken(
        newAccessToken
      );

      setUser(
        meResponse.data.user
      );

      setRestaurant(
        meResponse.data.restaurant
      );
    } catch {
      await clearTokens();

      setAccessToken(null);
      setUser(null);
      setRestaurant(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(
    email,
    password
  ) {
    const response =
      await api.login({
        email,
        password,
      });

    const {
      accessToken,
      refreshToken,
      user,
      restaurant,
    } = response.data;

    await saveTokens({
      accessToken,
      refreshToken,
    });

    setAccessToken(
      accessToken
    );

    setUser(user);
    setRestaurant(restaurant);
  }

  async function logout() {
    await clearTokens();

    setAccessToken(null);
    setUser(null);
    setRestaurant(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        restaurant,
        accessToken,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}