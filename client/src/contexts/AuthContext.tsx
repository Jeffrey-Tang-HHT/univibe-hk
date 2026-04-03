import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getToken, getUser, isLoggedIn as checkLoggedIn, logout as doLogout, type User } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoggedIn: false,
  loading: false,
  logout: () => {},
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize SYNCHRONOUSLY from localStorage so isLoggedIn is correct on first render
  const [user, setUser] = useState<User | null>(() => getUser());
  const [token, setToken] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState(false);

  const refreshUser = () => {
    const t = getToken();
    const u = getUser();
    setToken(t);
    setUser(u);
  };

  useEffect(() => {
    // Listen for storage changes (e.g., login/logout in another tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'univibe_token' || e.key === 'univibe_user') {
        refreshUser();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const logout = () => {
    doLogout();
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoggedIn: !!token && !!user,
      loading,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
