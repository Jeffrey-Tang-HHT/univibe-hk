import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface UserProfile {
  id: string;
  email: string;
  institution: string;
  mbti: string;
  major: string;
  displayName: string;
  privacyMode: "ghost" | "campus" | "major";
  sexuality: string;
  interests: string[];
  bio: string;
  avatar: string;
  isPro: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  login: (email: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USER: UserProfile = {
  id: "u_001",
  email: "",
  institution: "HKU",
  mbti: "ENFP",
  major: "Computer Science",
  displayName: "Anonymous Panda",
  privacyMode: "campus",
  sexuality: "prefer_not_to_say",
  interests: ["Coding", "Hiking", "Photography"],
  bio: "",
  avatar: "",
  isPro: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("univibe-user");
      if (saved) {
        try { return JSON.parse(saved); } catch { return null; }
      }
    }
    return null;
  });

  const login = useCallback((email: string) => {
    const newUser = { ...MOCK_USER, email, id: `u_${Date.now()}` };
    setUser(newUser);
    localStorage.setItem("univibe-user", JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("univibe-user");
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem("univibe-user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
