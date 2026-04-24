import { randomUUID } from 'crypto';
import { checkBodySize, getStorageObjectPath, rateLimit, setCors, validateImageBytes } from '../lib/security.mjs';
import { getSupabaseAdminConfig, getUserById, updateUser } from '../lib/supabase.mjs';
import { verifyToken } from '../lib/token.mjs';

const MAX_PHOTOS = 5;

async function deleteAvatarObject(objectPath, supabaseUrl, supabaseKey) {
  if (!objectPath) return;
  try {
    await fetch(`${supabaseUrl}/storage/v1/object/avatars/${objectPath}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
  } catch {}
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!checkBodySize(req, res, 5 * 1024 * 1024)) return;

  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = verifyToken(auth.split(' ')[1]);
    if (!decoded) return res.status(401).json({ error: 'Token expired' });

    const { url: supabaseUrl, key: supabaseKey } = getSupabaseAdminConfig();

    if (!rateLimit(`upload:${decoded.userId}`, 10, 60 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many uploads. Please try again later.' });
    }

    if (req.method === 'DELETE') {
      const { index } = req.body;
      if (typeof index !== 'number' || index < 0 || index >= MAX_PHOTOS) {
        return res.status(400).json({ error: 'Invalid index' });
      }

      const user = await getUserById(decoded.userId);
      let photos = [];
      try {
        photos = typeof user.photos === 'string' ? JSON.parse(user.photos) : (Array.isArray(user.photos) ? [...user.photos] : []);
      } catch {
        photos = [];
      }
      if (index >= photos.length) return res.status(400).json({ error: 'Index out of range' });

      await deleteAvatarObject(getStorageObjectPath(photos[index], 'avatars'), supabaseUrl, supabaseKey);

      photos.splice(index, 1);
      const avatar_url = photos[0] || null;
      await updateUser(decoded.userId, { photos: JSON.stringify(photos), avatar_url });
      return res.status(200).json({ success: true, photos, avatar_url });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { image_base64, index: requestedIndex } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'Missing image_base64' });

    const user = await getUserById(decoded.userId);
    let photos = [];
    try {
      photos = typeof user.photos === 'string' ? JSON.parse(user.photos) : (Array.isArray(user.photos) ? [...user.photos] : []);
    } catch {
      photos = [];
    }

    const targetIndex = (typeof requestedIndex === 'number' && requestedIndex >= 0) ? requestedIndex : photos.length;
    if (targetIndex >= MAX_PHOTOS) return res.status(400).json({ error: `Maximum ${MAX_PHOTOS} photos allowed` });

    const matches = image_base64.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: 'Invalid image format. Only jpeg, png, and webp are allowed.' });
    const mimeType = `image/${matches[1]}`;
    const buffer = Buffer.from(matches[2], 'base64');

    if (buffer.length > 2 * 1024 * 1024) return res.status(400).json({ error: 'Image too large (max 2MB)' });
    if (!validateImageBytes(buffer, mimeType)) {
      return res.status(400).json({ error: 'File content does not match the declared image type' });
    }

    const previousPath = getStorageObjectPath(photos[targetIndex], 'avatars');
    const ext = mimeType.endsWith('png') ? 'png' : mimeType.endsWith('webp') ? 'webp' : 'jpg';
    const objectPath = `${decoded.userId}/${randomUUID()}.${ext}`;

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/avatars/${objectPath}`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) return res.status(500).json({ error: 'Upload failed' });

    const photoUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${objectPath}?t=${Date.now()}`;
    while (photos.length <= targetIndex) photos.push(null);
    photos[targetIndex] = photoUrl;
    while (photos.length > 0 && photos[photos.length - 1] === null) photos.pop();

    const avatar_url = photos[0] || null;
    await updateUser(decoded.userId, { photos: JSON.stringify(photos), avatar_url });
    await deleteAvatarObject(previousPath, supabaseUrl, supabaseKey);

    return res.status(200).json({ success: true, photos, avatar_url, index: targetIndex });
  } catch (err) {
    console.error('Upload avatar error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
