import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getToken, getUser, logout as doLogout, updateProfile as doUpdateProfile, type User } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  logout: () => void;
  refreshUser: () => void;
  updateProfile: (updates: Record<string, any>) => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoggedIn: false,
  loading: false,
  logout: () => {},
  refreshUser: () => {},
  updateProfile: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
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

  const updateProfile = async (updates: Record<string, any>): Promise<User | null> => {
    const result = await doUpdateProfile(updates);
    if (result) {
      setUser(result);
    }
    return result;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoggedIn: !!token && !!user,
      loading,
      logout,
      refreshUser,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
