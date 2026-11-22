// The web version keeps the tokens in the browser's localStorage,
// since the iPhone keychain (SecureStore) does not exist there.
const ACCESS_TOKEN_KEY = "atrionovo_access_token";
const REFRESH_TOKEN_KEY = "atrionovo_refresh_token";

function store() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export async function saveTokens({ accessToken, refreshToken }) {
  store()?.setItem(ACCESS_TOKEN_KEY, accessToken);
  store()?.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getAccessToken() {
  return store()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export async function getRefreshToken() {
  return store()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export async function clearTokens() {
  store()?.removeItem(ACCESS_TOKEN_KEY);
  store()?.removeItem(REFRESH_TOKEN_KEY);
}
