import { supabaseQuery, getUserById, updateUser } from '../lib/supabase.mjs';
import { setCors, requireAuth, rateLimit, getClientIP, sanitizeText, isValidUUID, checkBodySize } from '../lib/security.mjs';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'POST' && !checkBodySize(req, res, 512 * 1024)) return;

  const action = req.query.action;
  const ip = getClientIP(req);

  try {
    // ========== UPDATE POSITION (heartbeat) ==========
    if (action === 'update-position' && req.method === 'POST') {
      const user = requireAuth(req, res);
      if (!user) return;

      if (!rateLimit(`plaza-pos:${user.userId}`, 30, 5000)) {
        return res.status(429).json({ error: 'Too many updates' });
      }

      const { x, y, z, rotation, zone, is_moving } = req.body;

      // Validate position bounds
      const px = Math.max(-50, Math.min(50, parseFloat(x) || 0));
      const py = Math.max(0, Math.min(10, parseFloat(y) || 0));
      const pz = Math.max(-50, Math.min(50, parseFloat(z) || 0));
      const rot = parseFloat(rotation) || 0;
      const validZones = ['center', 'study', 'social', 'dating', 'cafe'];
      const safeZone = validZones.includes(zone) ? zone : 'center';

      // Upsert presence
      const presenceData = {
        user_id: user.userId,
        x: px, y: py, z: pz,
        rotation: rot,
        zone: safeZone,
        is_moving: !!is_moving,
        updated_at: new Date().toISOString()
      };

      // Try update first, then insert
      const existing = await supabaseQuery('plaza_presence', {
        filters: `user_id=eq.${user.userId}`,
        select: 'user_id'
      });

      if (existing.length > 0) {
        await supabaseQuery('plaza_presence', {
          method: 'PATCH',
          filters: `user_id=eq.${user.userId}`,
          body: presenceData
        });
      } else {
        await supabaseQuery('plaza_presence', {
          method: 'POST',
          body: presenceData
        });
      }

      // Also update user last_seen
      await supabaseQuery('users', {
        method: 'PATCH',
        filters: `id=eq.${user.userId}`,
        body: { last_seen: new Date().toISOString() }
      });

      return res.status(200).json({ success: true });
    }

    // ========== GET PLAYERS ==========
    if (action === 'get-players' && req.method === 'GET') {
      const user = requireAuth(req, res);
      if (!user) return;

      if (!rateLimit(`plaza-get:${user.userId}`, 60, 10000)) {
        return res.status(429).json({ error: 'Too many requests' });
      }

      // Get all active presences (updated in last 15 seconds)
      const cutoff = new Date(Date.now() - 15000).toISOString();
      const presences = await supabaseQuery('plaza_presence', {
        filters: `updated_at=gte.${cutoff}`,
        select: '*'
      });

      // Fetch user info for each presence
      const players = [];
      for (const p of presences) {
        try {
          const u = await getUserById(p.user_id);
          if (!u) continue;
          players.push({
            id: p.user_id,
            display_name: u.display_name || u.username || 'Anonymous',
            school: u.school || '',
            mbti: u.mbti || '',
            avatar_config: u.avatar_config || {},
            x: p.x, y: p.y, z: p.z,
            rotation: p.rotation,
            zone: p.zone,
            is_moving: p.is_moving,
            is_me: p.user_id === user.userId
          });
        } catch (e) {}
      }

      return res.status(200).json({ players });
    }

    // ========== SEND BUBBLE ==========
    if (action === 'send-bubble' && req.method === 'POST') {
      const user = requireAuth(req, res);
      if (!user) return;

      if (!rateLimit(`plaza-bubble:${user.userId}`, 10, 30000)) {
        return res.status(429).json({ error: 'Too many messages' });
      }

      const { content, x, y, z } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message required' });
      }

      const safeContent = sanitizeText(content.trim(), 200);
      const px = Math.max(-50, Math.min(50, parseFloat(x) || 0));
      const py = Math.max(0, Math.min(10, parseFloat(y) || 0));
      const pz = Math.max(-50, Math.min(50, parseFloat(z) || 0));

      const bubble = await supabaseQuery('plaza_bubbles', {
        method: 'POST',
        body: {
          user_id: user.userId,
          content: safeContent,
          x: px, y: py, z: pz
        }
      });

      return res.status(200).json({ success: true, bubble: bubble[0] });
    }

    // ========== GET BUBBLES ==========
    if (action === 'get-bubbles' && req.method === 'GET') {
      const user = requireAuth(req, res);
      if (!user) return;

      if (!rateLimit(`plaza-getbub:${user.userId}`, 60, 10000)) {
        return res.status(429).json({ error: 'Too many requests' });
      }

      // Get bubbles from last 5 minutes
      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const bubbles = await supabaseQuery('plaza_bubbles', {
        filters: `created_at=gte.${cutoff}&order=created_at.desc&limit=50`,
        select: '*'
      });

      // Attach user info
      const result = [];
      for (const b of bubbles) {
        try {
          const u = await getUserById(b.user_id);
          result.push({
            id: b.id,
            user_id: b.user_id,
            display_name: u?.display_name || u?.username || 'Anonymous',
            content: b.content,
            x: b.x, y: b.y, z: b.z,
            created_at: b.created_at
          });
        } catch (e) {}
      }

      return res.status(200).json({ bubbles: result });
    }

    // ========== SAVE AVATAR ==========
    if (action === 'save-avatar' && req.method === 'POST') {
      const user = requireAuth(req, res);
      if (!user) return;

      if (!rateLimit(`plaza-avatar:${user.userId}`, 10, 60000)) {
        return res.status(429).json({ error: 'Too many updates' });
      }

      const { avatar_config } = req.body;
      if (!avatar_config || typeof avatar_config !== 'object') {
        return res.status(400).json({ error: 'Invalid avatar config' });
      }

      // Validate avatar config fields
      const validConfig = {
        bodyColor: String(avatar_config.bodyColor || '#6C63FF').slice(0, 7),
        skinColor: String(avatar_config.skinColor || '#FFD5B8').slice(0, 7),
        hairColor: String(avatar_config.hairColor || '#4A3728').slice(0, 7),
        hairStyle: Math.max(0, Math.min(5, parseInt(avatar_config.hairStyle) || 0)),
        shirtColor: String(avatar_config.shirtColor || '#6C63FF').slice(0, 7),
        pantsColor: String(avatar_config.pantsColor || '#2D2D2D').slice(0, 7),
        accessory: Math.max(0, Math.min(4, parseInt(avatar_config.accessory) || 0)),
        expression: Math.max(0, Math.min(3, parseInt(avatar_config.expression) || 0)),
      };

      await updateUser(user.userId, { avatar_config: validConfig });

      return res.status(200).json({ success: true, avatar_config: validConfig });
    }

    // ========== LEAVE PLAZA ==========
    if (action === 'leave' && req.method === 'POST') {
      const user = requireAuth(req, res);
      if (!user) return;

      // Delete presence
      try {
        await supabaseQuery('plaza_presence', {
          method: 'DELETE',
          filters: `user_id=eq.${user.userId}`
        });
      } catch (e) {}

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (err) {
    console.error('Plaza API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
