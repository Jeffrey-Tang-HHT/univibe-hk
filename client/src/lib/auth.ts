// Auth helper — use this across pages to check login state
export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  display_name?: string;
  avatar_url?: string;
  photos?: string[];
  gender?: string;
  sexuality?: string;
  school?: string;
  faculty?: string;
  district?: string;
  mbti?: string;
  age?: number;
  bio?: string;
  relationship_type?: string;
  religion?: string;
  interests?: string[];
  language?: string;
}

export function getToken(): string | null {
  return localStorage.getItem('unigo_token');
}

export function getUser(): User | null {
  const data = localStorage.getItem('unigo_user');
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

export function isLoggedIn(): boolean {
  return !!getToken() && !!getUser();
}

export function logout() {
  localStorage.removeItem('unigo_token');
  localStorage.removeItem('unigo_user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export function updateStoredUser(updates: Partial<User>) {
  const user = getUser();
  if (!user) return;
  const updated = { ...user, ...updates };
  localStorage.setItem('unigo_user', JSON.stringify(updated));
}

export async function fetchProfile(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/get-profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('unigo_token');
        localStorage.removeItem('unigo_user');
      }
      return null;
    }
    const data = await res.json();
    localStorage.setItem('unigo_user', JSON.stringify(data.user));
    return data.user;
  } catch {
    return null;
  }
}

export async function updateProfile(updates: Record<string, any>): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/update-profile', {
      method: 'POST',  // FIXED: was PATCH, but API only accepts POST
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('unigo_token');
        localStorage.removeItem('unigo_user');
      }
      return null;
    }

    const data = await res.json();
    // API returns { success: true, profile: {...} }
    const profile = data.user || data.profile;
    if (profile) {
      localStorage.setItem('unigo_user', JSON.stringify(profile));
    }
    return profile;
  } catch {
    return null;
  }
}
