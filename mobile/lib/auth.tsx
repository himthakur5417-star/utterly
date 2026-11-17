import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "expo-router";
import { api, apiRequest, clearSession, getStoredUser, storeUser } from "./api";

interface AuthState {
  user: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    const stored = await getStoredUser();
    if (stored) setUser(stored);
  }, []);

  useEffect(() => {
    hydrate().finally(() => setLoading(false));
  }, [hydrate]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      await storeUser(data.user);
      setUser(data.user);
      router.replace("/dashboard");
    },
    [router],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await apiRequest("/api/auth/signup", {
        method: "POST",
        body: { name, email, password },
      });
      await storeUser(data.user);
      setUser(data.user);
      router.replace("/dashboard");
    },
    [router],
  );

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
    router.replace("/");
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get("/api/auth/session");
      if (data.user) {
        await storeUser(data.user);
        setUser(data.user);
      }
    } catch {
      // session invalid — leave cached user
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
