import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { authApi, getAuthToken } from './api';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ message?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      authApi
        .getMe()
        .then((userData) => setUser(userData))
        .catch(() => {
          authApi.logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function signIn(email: string, password: string) {
    const data = await authApi.login(email, password);
    setUser(data.user);
  }

  async function signUp(email: string, password: string) {
    const data = await authApi.register(email, password);
    setUser(data.user);
    return {};
  }

  function signOut() {
    authApi.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
