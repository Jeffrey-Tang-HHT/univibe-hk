const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

export async function supabaseQuery(table, { method = 'GET', filters = '', body = null, select = '*' } = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filters ? '&' + filters : ''}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Supabase error: ${res.status} - ${error}`);
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
