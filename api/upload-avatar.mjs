import { verifyToken } from '../lib/token.mjs';
import { updateUser, getUserById } from '../lib/supabase.mjs';
import { setCors, rateLimit, checkBodySize, validateImageBytes } from '../lib/security.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const MAX_PHOTOS = 5;

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Max 5MB for avatar uploads
  if (!checkBodySize(req, res, 5 * 1024 * 1024)) return;

  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = verifyToken(auth.split(' ')[1]);
    if (!decoded) return res.status(401).json({ error: 'Token expired' });

    // Rate limit: 10 uploads per user per hour
    if (!rateLimit(`upload:${decoded.userId}`, 10, 60 * 60 * 1000)) {
      return res.status(429).json({ error: '上傳太頻繁' });
    }

    // DELETE photo by index
    if (req.method === 'DELETE') {
      const { index } = req.body;
      if (typeof index !== 'number' || index < 0 || index >= MAX_PHOTOS) {
        return res.status(400).json({ error: 'Invalid index' });
      }
      const user = await getUserById(decoded.userId);
      let photos = [];
      try { photos = typeof user.photos === 'string' ? JSON.parse(user.photos) : (Array.isArray(user.photos) ? [...user.photos] : []); } catch { photos = []; }
      if (index >= photos.length) return res.status(400).json({ error: 'Index out of range' });

      const url = photos[index];
      if (url && url.includes('/storage/v1/object/public/avatars/')) {
        try {
          const fileName = url.split('/avatars/')[1]?.split('?')[0];
          if (fileName) {
            await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`, {
              method: 'DELETE',
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
            });
          }
        } catch (e) {}
      }

      photos.splice(index, 1);
      const avatar_url = photos[0] || null;
      await updateUser(decoded.userId, { photos: JSON.stringify(photos), avatar_url });
      return res.status(200).json({ success: true, photos, avatar_url });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { image_base64, index: reqIndex } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'Missing image_base64' });

    const user = await getUserById(decoded.userId);
    let photos = [];
    try { photos = typeof user.photos === 'string' ? JSON.parse(user.photos) : (Array.isArray(user.photos) ? [...user.photos] : []); } catch { photos = []; }

    const targetIndex = (typeof reqIndex === 'number' && reqIndex >= 0) ? reqIndex : photos.length;
    if (targetIndex >= MAX_PHOTOS) return res.status(400).json({ error: `Maximum ${MAX_PHOTOS} photos allowed` });

    const matches = image_base64.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: 'Invalid image format. Only jpeg/png/webp allowed.' });
    const mimeType = `image/${matches[1]}`;
    const raw = matches[2];
    const buffer = Buffer.from(raw, 'base64');

    if (buffer.length > 2 * 1024 * 1024) return res.status(400).json({ error: 'Image too large (max 2MB)' });

    // Verify actual file content matches declared MIME type
    if (!validateImageBytes(buffer, mimeType)) {
      return res.status(400).json({ error: 'File content does not match declared image type' });
    }

    const ext = mimeType.split('/')[1] === 'png' ? 'png' : 'jpg';
    const fileName = `${decoded.userId}_${targetIndex}.${ext}`;

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': mimeType, 'x-upsert': 'true',
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) return res.status(500).json({ error: 'Upload failed' });

    const photoUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}?t=${Date.now()}`;
    while (photos.length <= targetIndex) photos.push(null);
    photos[targetIndex] = photoUrl;
    while (photos.length > 0 && photos[photos.length - 1] === null) photos.pop();

    const avatar_url = photos[0] || null;
    await updateUser(decoded.userId, { photos: JSON.stringify(photos), avatar_url });

    return res.status(200).json({ success: true, photos, avatar_url, index: targetIndex });
  } catch (err) {
    console.error('Upload avatar error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
