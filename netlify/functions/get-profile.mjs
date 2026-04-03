// Get user profile
// GET /api/profile (requires Authorization header)
// GET /api/profile?username=xxx (public profile)

import { getUserById, getUserByUsername } from './utils/supabase.mjs';
import { verifyToken } from './utils/token.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

// Fields safe to show publicly
const PUBLIC_FIELDS = ['id', 'username', 'display_name', 'avatar_url', 'gender', 'school', 'faculty', 'mbti', 'bio', 'interests', 'age', 'district', 'sexuality', 'relationship_type', 'religion'];

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const targetUsername = url.searchParams.get('username');

    // Public profile lookup
    if (targetUsername) {
      const user = await getUserByUsername(targetUsername.toLowerCase());
      if (!user) {
        return Response.json(
          { error: '找不到此用戶 / User not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      
      const publicProfile = {};
      PUBLIC_FIELDS.forEach(f => { publicProfile[f] = user[f]; });
      
      return Response.json({ user: publicProfile }, { headers: corsHeaders });
    }

    // Own profile (requires auth)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json(
        { error: '請先登入 / Please log in' },
        { status: 401, headers: corsHeaders }
      );
    }

    const tokenData = verifyToken(authHeader.slice(7));
    if (!tokenData) {
      return Response.json(
        { error: '登入已過期，請重新登入 / Session expired, please log in again' },
        { status: 401, headers: corsHeaders }
      );
    }

    const user = await getUserById(tokenData.userId);
    if (!user) {
      return Response.json(
        { error: '找不到此用戶 / User not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Return full profile (excluding password hash)
    const { password_hash, ...profile } = user;
    
    return Response.json({ user: profile }, { headers: corsHeaders });

  } catch (err) {
    console.error('Profile error:', err);
    return Response.json(
      { error: '獲取資料失敗 / Failed to get profile' },
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = { path: '/api/profile' };
