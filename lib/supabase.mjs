import { getRequiredEnv } from './env.mjs';

const ALLOWED_TABLES = new Set(['users', 'matches', 'messages', 'likes', 'blocks', 'reports', 'posts', 'post_likes', 'comments', 'plaza_presence', 'plaza_bubbles']);

export function getSupabaseAdminConfig() {
  return {
    url: getRequiredEnv('SUPABASE_URL', { minLength: 10 }),
    key: getRequiredEnv('SUPABASE_SERVICE_KEY', { minLength: 20 }),
  };
}

export async function supabaseQuery(table, { method = 'GET', filters = '', body = null, select = '*' } = {}) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error('Invalid table');
  }

  const { url: supabaseUrl, key: supabaseKey } = getSupabaseAdminConfig();
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const url = `${supabaseUrl}/rest/v1/${table}?select=${select}${filters ? `&${filters}` : ''}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.text();
    console.error(`Supabase error [${table}]: ${res.status} - ${error}`);
    throw new Error('Database operation failed');
  }
  return await res.json();
}

export async function insertUser(userData) {
  return supabaseQuery('users', { method: 'POST', body: userData });
}

export async function getUserByUsername(username) {
  const data = await supabaseQuery('users', { filters: `username=eq.${encodeURIComponent(username)}` });
  return data?.[0] || null;
}

export async function getUserByEmail(email) {
  const data = await supabaseQuery('users', { filters: `email=eq.${encodeURIComponent(email)}` });
  return data?.[0] || null;
}

export async function getUserById(id) {
  const data = await supabaseQuery('users', { filters: `id=eq.${encodeURIComponent(id)}` });
  return data?.[0] || null;
}

export async function updateUser(id, updates) {
  return supabaseQuery('users', { method: 'PATCH', filters: `id=eq.${encodeURIComponent(id)}`, body: updates });
}

export async function updateLastLogin(id) {
  return updateUser(id, { last_login: new Date().toISOString() });
}
