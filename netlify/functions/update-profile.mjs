// Update user profile
// PATCH /api/profile (requires Authorization header)
// Body: { displayName?, gender?, school?, faculty?, mbti?, bio?, interests?, ... }

import { updateUser } from './utils/supabase.mjs';
import { verifyToken } from './utils/token.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS'
};

// Fields that can be updated
const ALLOWED_FIELDS = [
  'display_name', 'avatar_url', 'gender', 'sexuality', 'school', 
  'faculty', 'district', 'mbti', 'age', 'bio', 'relationship_type', 
  'religion', 'interests', 'language'
];

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { headers: corsHeaders });
  }

  try {
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

    const body = await request.json();

    // Only allow specific fields to be updated
    const updates = {};
    ALLOWED_FIELDS.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });

    // Map camelCase from frontend to snake_case
    if (body.displayName !== undefined) updates.display_name = body.displayName;
    if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl;
    if (body.relationshipType !== undefined) updates.relationship_type = body.relationshipType;

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { error: '沒有可更新的欄位 / No valid fields to update' },
        { status: 400, headers: corsHeaders }
      );
    }

    const [updatedUser] = await updateUser(tokenData.userId, updates);

    const { password_hash, ...profile } = updatedUser;

    return Response.json(
      { success: true, user: profile },
      { headers: corsHeaders }
    );

  } catch (err) {
    console.error('Update profile error:', err);
    return Response.json(
      { error: '更新資料失敗 / Failed to update profile' },
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = { path: '/api/update-profile' };
