// Login user with username + password
// POST /api/login
// Body: { username, password }

import { getUserByUsername } from './utils/supabase.mjs';
import { verifyPassword } from './utils/password.mjs';
import { createToken } from './utils/token.mjs';
import { updateLastLogin } from './utils/supabase.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { headers: corsHeaders });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json(
        { error: '請輸入用戶名和密碼 / Please enter username and password' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Find user by username (case-insensitive)
    const user = await getUserByUsername(username.toLowerCase());

    if (!user) {
      return Response.json(
        { error: '用戶名或密碼錯誤 / Invalid username or password' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      return Response.json(
        { error: '用戶名或密碼錯誤 / Invalid username or password' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Update last login time
    await updateLastLogin(user.id).catch(() => {});

    // Create session token
    const token = createToken(user.id, user.username);

    return Response.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.display_name,
          avatar_url: user.avatar_url,
          gender: user.gender,
          school: user.school,
          faculty: user.faculty,
          mbti: user.mbti,
        }
      },
      { headers: corsHeaders }
    );

  } catch (err) {
    console.error('Login error:', err);
    return Response.json(
      { error: '登入失敗，請稍後再試 / Login failed, please try again' },
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = { path: '/api/login' };
