import { verifyToken } from './utils/token.mjs';
import { updateUser } from './utils/supabase.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = verifyToken(auth.split(' ')[1]);
    if (!decoded) return res.status(401).json({ error: 'Token expired' });

    const { image_base64 } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'Missing image_base64' });

    // Decode base64 — expect "data:image/jpeg;base64,xxxx" or raw base64
    const matches = image_base64.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
    const mimeType = matches ? `image/${matches[1]}` : 'image/jpeg';
    const raw = matches ? matches[2] : image_base64;
    const buffer = Buffer.from(raw, 'base64');

    // Max 2MB
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max 2MB)' });
    }

    const ext = mimeType.split('/')[1] === 'png' ? 'png' : 'jpg';
    const fileName = `${decoded.userId}.${ext}`;

    // Upload to Supabase Storage
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      // If bucket doesn't exist, fall back to storing as data URL in avatar_url
      const avatarDataUrl = `data:${mimeType};base64,${raw.substring(0, 500000)}`; // truncate if huge
      await updateUser(decoded.userId, { avatar_url: `data:${mimeType};base64,${raw}` });
      return res.status(200).json({
        success: true,
        avatar_url: `data:${mimeType};base64,${raw}`,
        method: 'inline',
      });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}?t=${Date.now()}`;
    await updateUser(decoded.userId, { avatar_url: publicUrl });

    return res.status(200).json({ success: true, avatar_url: publicUrl, method: 'storage' });
  } catch (err) {
    console.error('Upload avatar error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
