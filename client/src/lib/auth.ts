// Auth helper — use this across pages to check login state

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar_url?: string;
  gender?: string;
  school?: string;
  faculty?: string;
  mbti?: string;
}

export function getToken(): string | null {
  return localStorage.getItem('univibe_token');
}

export function getUser(): User | null {
  const data = localStorage.getItem('univibe_user');
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

export function isLoggedIn(): boolean {
  return !!getToken() && !!getUser();
}

export function logout() {
  localStorage.removeItem('univibe_token');
  localStorage.removeItem('univibe_user');
  window.location.href = '/login';
}

export function updateStoredUser(updates: Partial<User>) {
  const user = getUser();
  if (!user) return;
  const updated = { ...user, ...updates };
  localStorage.setItem('univibe_user', JSON.stringify(updated));
}

export async function fetchProfile(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  
  try {
    const res = await fetch('/api/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401) logout();
      return null;
    }
    const data = await res.json();
    // Update local storage with fresh data
    localStorage.setItem('univibe_user', JSON.stringify(data.user));
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
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      if (res.status === 401) logout();
      return null;
    }
    const data = await res.json();
    localStorage.setItem('univibe_user', JSON.stringify(data.user));
    return data.user;
  } catch {
    return null;
  }
}
