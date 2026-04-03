import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getToken, getUser, isLoggedIn, logout, type User } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  signOut: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  signOut: () => {},
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = () => {
    const t = getToken();
    const u = getUser();
    setToken(t);
    setUser(u);
    setLoading(false);
  };

  useEffect(() => {
    refreshUser();
    
    // Listen for storage changes (e.g., login/logout in another tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'univibe_token' || e.key === 'univibe_user') {
        refreshUser();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const signOut = () => {
    logout();
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token && !!user,
      loading,
      signOut,
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
