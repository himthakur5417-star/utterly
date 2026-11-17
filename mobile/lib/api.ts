import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const COOKIE_KEY = "utterly_session_cookie";
const SESSION_KEY = "utterly_session_user";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function getCookie(): Promise<string | null> {
  return AsyncStorage.getItem(COOKIE_KEY);
}
async function setCookie(value: string | null) {
  if (value) await AsyncStorage.setItem(COOKIE_KEY, value);
  else await AsyncStorage.removeItem(COOKIE_KEY);
}

export async function getStoredUser(): Promise<any | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
export async function storeUser(user: any | null) {
  if (user) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else await AsyncStorage.removeItem(SESSION_KEY);
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T = any>(
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  const method = opts.method || "GET";
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (opts.auth !== false) {
    const cookie = await getCookie();
    if (cookie) headers.Cookie = cookie;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  // Capture any new session cookie set by the server
  const setCookieHeader = res.headers.get("set-cookie");
  if (setCookieHeader) {
    const cookie = setCookieHeader.split(";")[0];
    if (cookie) await setCookie(cookie);
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new ApiError(data?.error || "Request failed", res.status);
  }
  return data as T;
}

export const api = {
  get: <T = any>(path: string, auth = true) => apiRequest<T>(path, { auth }),
  post: <T = any>(path: string, body?: unknown, auth = true) =>
    apiRequest<T>(path, { method: "POST", body, auth }),
  patch: <T = any>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body }),
  del: <T = any>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};

export async function clearSession() {
  await setCookie(null);
  await storeUser(null);
}
