// Register new user
// POST /api/register
// Body: { email, username, password, displayName? }

import { insertUser, getUserByUsername, getUserByEmail } from './utils/supabase.mjs';
import { hashPassword } from './utils/password.mjs';
import { createToken } from './utils/token.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { headers: corsHeaders });
  }

  try {
    const { email, username, password, displayName } = await request.json();

    // Validate inputs
    if (!email || !username || !password) {
      return Response.json(
        { error: '請填寫所有必填欄位 / Please fill in all required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate username: 3-20 chars, alphanumeric + underscores
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return Response.json(
        { error: '用戶名只能包含字母、數字和底線，3-20個字符 / Username: 3-20 chars, letters, numbers, underscores only' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate password: min 6 chars
    if (password.length < 6) {
      return Response.json(
        { error: '密碼至少6個字符 / Password must be at least 6 characters' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if username already exists
    const existingUsername = await getUserByUsername(username);
    if (existingUsername) {
      return Response.json(
        { error: '此用戶名已被使用 / Username already taken' },
        { status: 409, headers: corsHeaders }
      );
    }

    // Check if email already registered
    const existingEmail = await getUserByEmail(email);
    if (existingEmail) {
      return Response.json(
        { error: '此電郵已被註冊 / Email already registered' },
        { status: 409, headers: corsHeaders }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    const [user] = await insertUser({
      email,
      username: username.toLowerCase(),
      password_hash: passwordHash,
      display_name: displayName || username,
    });

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
        }
      },
      { status: 201, headers: corsHeaders }
    );

  } catch (err) {
    console.error('Register error:', err);
    return Response.json(
      { error: '註冊失敗，請稍後再試 / Registration failed, please try again' },
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = { path: '/api/register' };
