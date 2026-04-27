import { supabaseQuery, getUserById } from '../lib/supabase.mjs';
import { verifyToken } from '../lib/token.mjs';
import { setCors, rateLimit, getClientIP, sanitizeContent, isValidUUID, checkBodySize } from '../lib/security.mjs';

function getAuthorTag(user, privacyMode) {
  if (privacyMode === 'ghost') return { author: '匿名', authorTag: '匿名', authorTag_en: 'Anonymous' };
  if (privacyMode === 'campus') return { author: user.school || '???', authorTag: `${user.school || '???'} · ${user.mbti || '???'}`, authorTag_en: `${user.school || '???'} · ${user.mbti || '???'}` };
  return { author: user.school || '???', authorTag: `${user.school || '???'} · ${user.faculty || '???'} · ${user.mbti || '???'}`, authorTag_en: `${user.school || '???'} · ${user.faculty || '???'} · ${user.mbti || '???'}` };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'POST' && !checkBodySize(req, res, 1024 * 1024)) return;

  const action = req.query.action;

  let userId = null;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const decoded = verifyToken(auth.split(' ')[1]);
    if (decoded) userId = decoded.userId;
  }

  try {
    // ========== GET POSTS ==========
    if (action === 'get-posts' && req.method === 'GET') {
      const { category } = req.query;
      // Validate and cap limit/offset to prevent abuse
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 100);
      const offset = Math.max(parseInt(req.query.offset) || 0, 0);
      let filters = `order=created_at.desc&limit=${limit}&offset=${offset}`;
      // Validate category to prevent injection
      if (category && category !== 'all' && /^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(category)) {
        filters += `&category=eq.${category}`;
      }

      const posts = await supabaseQuery('posts', { filters, select: '*' });

      const userIds = [...new Set(posts.map(p => p.user_id))];
      const users = {};
      for (const uid of userIds) {
        try { const u = await getUserById(uid); if (u) users[uid] = u; } catch (e) {}
      }

      let likedPostIds = new Set();
      if (userId) {
        try {
          const myLikes = await supabaseQuery('post_likes', { filters: `user_id=eq.${userId}`, select: 'post_id' });
          myLikes.forEach(l => likedPostIds.add(l.post_id));
        } catch (e) {}
      }

      const result = posts.map(p => {
        const u = users[p.user_id];
        const tag = u ? getAuthorTag(u, p.privacy_mode) : { author: '匿名', authorTag: '匿名', authorTag_en: 'Anonymous' };
        return {
          id: p.id, user_id: p.user_id, author: tag.author, authorTag: tag.authorTag,
          authorTag_en: tag.authorTag_en, privacyMode: p.privacy_mode, category: p.category,
          content: p.content, image_url: p.image_url, poll_question: p.poll_question,
          poll_options: p.poll_options, poll_votes: p.poll_votes || {}, poll_voters: p.poll_voters || [],
          likes: p.likes_count || 0, comments: p.comments_count || 0, liked: likedPostIds.has(p.id),
          created_at: p.created_at,
        };
      });

      return res.status(200).json({ posts: result });
    }

    // ========== CREATE POST ==========
    if (action === 'create-post' && req.method === 'POST') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const ip = getClientIP(req);
      // Rate limit: 10 posts per user per hour
      if (!rateLimit(`post:${userId}`, 10, 60 * 60 * 1000)) {
        return res.status(429).json({ error: '發帖太頻繁，請稍後再試' });
      }

      const { content, category = 'trending', privacy_mode = 'ghost', image_url, poll_question, poll_options } = req.body;
      if (!content?.trim() && !poll_question) return res.status(400).json({ error: 'Content required' });

      const postBody = {
        user_id: userId,
        content: sanitizeContent(content || '', 10000),
        category,
        privacy_mode,
        image_url: image_url || null,
      };

      if (poll_question && poll_options && Array.isArray(poll_options) && poll_options.length >= 2 && poll_options.length <= 6) {
        postBody.poll_question = sanitizeContent(poll_question, 500);
        postBody.poll_options = JSON.stringify(poll_options.map(o => sanitizeContent(String(o), 200)));
        postBody.poll_votes = JSON.stringify({});
        postBody.poll_voters = JSON.stringify([]);
      }

      const result = await supabaseQuery('posts', { method: 'POST', body: postBody });
      return res.status(201).json({ post: result[0] });
    }

    // ========== LIKE / UNLIKE POST ==========
    if (action === 'toggle-like' && req.method === 'POST') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { post_id } = req.body;
      if (!post_id || !isValidUUID(post_id)) return res.status(400).json({ error: 'Invalid post_id' });

      let existing = [];
      try { existing = await supabaseQuery('post_likes', { filters: `post_id=eq.${post_id}&user_id=eq.${userId}` }); } catch (e) {}

      if (existing.length > 0) {
        await supabaseQuery('post_likes', { method: 'DELETE', filters: `post_id=eq.${post_id}&user_id=eq.${userId}` });
        const posts = await supabaseQuery('posts', { filters: `id=eq.${post_id}`, select: 'likes_count' });
        const newCount = Math.max(0, (posts[0]?.likes_count || 1) - 1);
        await supabaseQuery('posts', { method: 'PATCH', filters: `id=eq.${post_id}`, body: { likes_count: newCount } });
        return res.status(200).json({ liked: false, likes: newCount });
      } else {
        await supabaseQuery('post_likes', { method: 'POST', body: { post_id, user_id: userId } });
        const posts = await supabaseQuery('posts', { filters: `id=eq.${post_id}`, select: 'likes_count' });
        const newCount = (posts[0]?.likes_count || 0) + 1;
        await supabaseQuery('posts', { method: 'PATCH', filters: `id=eq.${post_id}`, body: { likes_count: newCount } });
        return res.status(200).json({ liked: true, likes: newCount });
      }
    }

    // ========== VOTE ON POLL ==========
    if (action === 'vote-poll' && req.method === 'POST') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { post_id, option_index } = req.body;
      if (!post_id || !isValidUUID(post_id) || option_index === undefined) return res.status(400).json({ error: 'Missing fields' });
      if (typeof option_index !== 'number' || option_index < 0 || option_index > 10) return res.status(400).json({ error: 'Invalid option' });

      const posts = await supabaseQuery('posts', { filters: `id=eq.${post_id}`, select: 'poll_votes,poll_voters,poll_options' });
      if (posts.length === 0) return res.status(404).json({ error: 'Post not found' });

      const post = posts[0];
      let votes = typeof post.poll_votes === 'string' ? JSON.parse(post.poll_votes) : (post.poll_votes || {});
      let voters = typeof post.poll_voters === 'string' ? JSON.parse(post.poll_voters) : (post.poll_voters || []);

      if (voters.includes(userId)) return res.status(400).json({ error: 'Already voted' });

      const key = String(option_index);
      votes[key] = (votes[key] || 0) + 1;
      voters.push(userId);

      await supabaseQuery('posts', {
        method: 'PATCH', filters: `id=eq.${post_id}`,
        body: { poll_votes: JSON.stringify(votes), poll_voters: JSON.stringify(voters) }
      });

      return res.status(200).json({ poll_votes: votes, voted: true });
    }

    // ========== GET COMMENTS ==========
    if (action === 'get-comments' && req.method === 'GET') {
      const { post_id } = req.query;
      if (!post_id || !isValidUUID(post_id)) return res.status(400).json({ error: 'Invalid post_id' });

      const comments = await supabaseQuery('comments', { filters: `post_id=eq.${post_id}&order=created_at.asc`, select: '*' });
      const userIds = [...new Set(comments.map(c => c.user_id))];
      const users = {};
      for (const uid of userIds) { try { const u = await getUserById(uid); if (u) users[uid] = u; } catch (e) {} }

      const result = comments.map(c => {
        const u = users[c.user_id];
        const tag = u ? getAuthorTag(u, c.privacy_mode) : { author: '匿名', authorTag: '匿名', authorTag_en: 'Anonymous' };
        return {
          id: c.id, user_id: c.user_id, author: tag.author, authorTag: tag.authorTag,
          authorTag_en: tag.authorTag_en, privacyMode: c.privacy_mode, content: c.content,
          likes: c.likes_count || 0, created_at: c.created_at, isMe: c.user_id === userId,
        };
      });

      return res.status(200).json({ comments: result });
    }

    // ========== ADD COMMENT ==========
    if (action === 'add-comment' && req.method === 'POST') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { post_id, content, privacy_mode = 'ghost' } = req.body;
      if (!post_id || !isValidUUID(post_id) || !content?.trim()) return res.status(400).json({ error: 'Missing fields' });

      if (!rateLimit(`comment:${userId}`, 20, 60 * 60 * 1000)) {
        return res.status(429).json({ error: '評論太頻繁' });
      }

      const result = await supabaseQuery('comments', {
        method: 'POST',
        body: { post_id, user_id: userId, content: sanitizeContent(content, 5000), privacy_mode }
      });

      const posts = await supabaseQuery('posts', { filters: `id=eq.${post_id}`, select: 'comments_count' });
      const newCount = (posts[0]?.comments_count || 0) + 1;
      await supabaseQuery('posts', { method: 'PATCH', filters: `id=eq.${post_id}`, body: { comments_count: newCount } });

      return res.status(201).json({ comment: result[0], comments_count: newCount });
    }

    // ========== DELETE COMMENT ==========
    if (action === 'delete-comment' && req.method === 'DELETE') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { comment_id, post_id } = req.body;
      if (!comment_id || !isValidUUID(comment_id)) return res.status(400).json({ error: 'Invalid comment_id' });

      const comments = await supabaseQuery('comments', { filters: `id=eq.${comment_id}&user_id=eq.${userId}` });
      if (comments.length === 0) return res.status(403).json({ error: 'Not your comment' });

      await supabaseQuery('comments', { method: 'DELETE', filters: `id=eq.${comment_id}` });

      if (post_id && isValidUUID(post_id)) {
        const posts = await supabaseQuery('posts', { filters: `id=eq.${post_id}`, select: 'comments_count' });
        const newCount = Math.max(0, (posts[0]?.comments_count || 1) - 1);
        await supabaseQuery('posts', { method: 'PATCH', filters: `id=eq.${post_id}`, body: { comments_count: newCount } });
      }

      return res.status(200).json({ success: true });
    }

    // ========== DELETE POST ==========
    if (action === 'delete-post' && req.method === 'DELETE') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { post_id } = req.body;
      if (!post_id || !isValidUUID(post_id)) return res.status(400).json({ error: 'Invalid post_id' });

      const posts = await supabaseQuery('posts', { filters: `id=eq.${post_id}&user_id=eq.${userId}` });
      if (posts.length === 0) return res.status(403).json({ error: 'Not your post' });

      // Delete comments first, then post
      await supabaseQuery('comments', { method: 'DELETE', filters: `post_id=eq.${post_id}` });
      await supabaseQuery('post_likes', { method: 'DELETE', filters: `post_id=eq.${post_id}` });
      await supabaseQuery('posts', { method: 'DELETE', filters: `id=eq.${post_id}` });
      return res.status(200).json({ success: true });
    }

    // ========== REPORT POST ==========
    if (action === 'report-post' && req.method === 'POST') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { post_id, reason } = req.body;
      if (!post_id || !isValidUUID(post_id)) return res.status(400).json({ error: 'Invalid post_id' });

      if (!rateLimit(`report-post:${userId}`, 10, 60 * 60 * 1000)) {
        return res.status(429).json({ error: '舉報太頻繁' });
      }

      await supabaseQuery('reports', { method: 'POST', body: { reporter_id: userId, reported_id: post_id, reason: sanitizeContent(reason || '', 500), type: 'post' } });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('Feed API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
