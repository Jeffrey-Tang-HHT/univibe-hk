import { supabaseQuery, getUserById } from './utils/supabase.mjs';
import { verifyToken } from './utils/token.mjs';

function getAuthorTag(user, privacyMode) {
  if (privacyMode === 'ghost') return { author: '匿名', authorTag: '匿名', authorTag_en: 'Anonymous' };
  if (privacyMode === 'campus') return { author: user.school || '???', authorTag: `${user.school || '???'} · ${user.mbti || '???'}`, authorTag_en: `${user.school || '???'} · ${user.mbti || '???'}` };
  // major
  return { author: user.school || '???', authorTag: `${user.school || '???'} · ${user.faculty || '???'} · ${user.mbti || '???'}`, authorTag_en: `${user.school || '???'} · ${user.faculty || '???'} · ${user.mbti || '???'}` };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  // Auth helper (optional for some actions)
  let userId = null;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const decoded = verifyToken(auth.split(' ')[1]);
    if (decoded) userId = decoded.userId;
  }

  try {
    // ========== GET POSTS ==========
    if (action === 'get-posts' && req.method === 'GET') {
      const { category, limit = '30', offset = '0' } = req.query;
      let filters = `order=created_at.desc&limit=${limit}&offset=${offset}`;
      if (category && category !== 'all') filters += `&category=eq.${category}`;

      const posts = await supabaseQuery('posts', { filters, select: '*' });

      // Get author info for each post
      const userIds = [...new Set(posts.map(p => p.user_id))];
      const users = {};
      for (const uid of userIds) {
        try {
          const u = await getUserById(uid);
          if (u) users[uid] = u;
        } catch (e) {}
      }

      // Check which posts the current user liked
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
          id: p.id,
          user_id: p.user_id,
          author: tag.author,
          authorTag: tag.authorTag,
          authorTag_en: tag.authorTag_en,
          privacyMode: p.privacy_mode,
          category: p.category,
          content: p.content,
          image_url: p.image_url,
          poll_question: p.poll_question,
          poll_options: p.poll_options,
          poll_votes: p.poll_votes || {},
          poll_voters: p.poll_voters || [],
          likes: p.likes_count || 0,
          comments: p.comments_count || 0,
          liked: likedPostIds.has(p.id),
          created_at: p.created_at,
        };
      });

      return res.status(200).json({ posts: result });
    }

    // ========== CREATE POST ==========
    if (action === 'create-post' && req.method === 'POST') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { content, category = 'trending', privacy_mode = 'ghost', image_url, poll_question, poll_options } = req.body;
      if (!content?.trim() && !poll_question) return res.status(400).json({ error: 'Content required' });

      const postBody = {
        user_id: userId,
        content: content || '',
        category,
        privacy_mode,
        image_url: image_url || null,
      };

      // Add poll fields if present
      if (poll_question && poll_options && poll_options.length >= 2) {
        postBody.poll_question = poll_question;
        postBody.poll_options = JSON.stringify(poll_options);
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
      if (!post_id) return res.status(400).json({ error: 'Missing post_id' });

      // Check if already liked
      let existing = [];
      try {
        existing = await supabaseQuery('post_likes', { filters: `post_id=eq.${post_id}&user_id=eq.${userId}` });
      } catch (e) {}

      if (existing.length > 0) {
        // Unlike
        await supabaseQuery('post_likes', { method: 'DELETE', filters: `post_id=eq.${post_id}&user_id=eq.${userId}` });
        // Decrement count
        const posts = await supabaseQuery('posts', { filters: `id=eq.${post_id}`, select: 'likes_count' });
        const newCount = Math.max(0, (posts[0]?.likes_count || 1) - 1);
        await supabaseQuery('posts', { method: 'PATCH', filters: `id=eq.${post_id}`, body: { likes_count: newCount } });
        return res.status(200).json({ liked: false, likes: newCount });
      } else {
        // Like
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
      if (!post_id || option_index === undefined) return res.status(400).json({ error: 'Missing fields' });

      const posts = await supabaseQuery('posts', { filters: `id=eq.${post_id}`, select: 'poll_votes,poll_voters,poll_options' });
      if (posts.length === 0) return res.status(404).json({ error: 'Post not found' });

      const post = posts[0];
      let votes = typeof post.poll_votes === 'string' ? JSON.parse(post.poll_votes) : (post.poll_votes || {});
      let voters = typeof post.poll_voters === 'string' ? JSON.parse(post.poll_voters) : (post.poll_voters || []);

      if (voters.includes(userId)) {
        return res.status(400).json({ error: 'Already voted' });
      }

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
      if (!post_id) return res.status(400).json({ error: 'Missing post_id' });

      const comments = await supabaseQuery('comments', {
        filters: `post_id=eq.${post_id}&order=created_at.asc`,
        select: '*'
      });

      const userIds = [...new Set(comments.map(c => c.user_id))];
      const users = {};
      for (const uid of userIds) {
        try {
          const u = await getUserById(uid);
          if (u) users[uid] = u;
        } catch (e) {}
      }

      const result = comments.map(c => {
        const u = users[c.user_id];
        const tag = u ? getAuthorTag(u, c.privacy_mode) : { author: '匿名', authorTag: '匿名', authorTag_en: 'Anonymous' };
        return {
          id: c.id,
          user_id: c.user_id,
          author: tag.author,
          authorTag: tag.authorTag,
          authorTag_en: tag.authorTag_en,
          privacyMode: c.privacy_mode,
          content: c.content,
          likes: c.likes_count || 0,
          created_at: c.created_at,
          isMe: c.user_id === userId,
        };
      });

      return res.status(200).json({ comments: result });
    }

    // ========== ADD COMMENT ==========
    if (action === 'add-comment' && req.method === 'POST') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { post_id, content, privacy_mode = 'ghost' } = req.body;
      if (!post_id || !content?.trim()) return res.status(400).json({ error: 'Missing fields' });

      const result = await supabaseQuery('comments', {
        method: 'POST',
        body: { post_id, user_id: userId, content, privacy_mode }
      });

      // Increment comments_count on post
      const posts = await supabaseQuery('posts', { filters: `id=eq.${post_id}`, select: 'comments_count' });
      const newCount = (posts[0]?.comments_count || 0) + 1;
      await supabaseQuery('posts', { method: 'PATCH', filters: `id=eq.${post_id}`, body: { comments_count: newCount } });

      return res.status(201).json({ comment: result[0], comments_count: newCount });
    }

    // ========== DELETE COMMENT ==========
    if (action === 'delete-comment' && req.method === 'DELETE') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { comment_id, post_id } = req.body;
      if (!comment_id) return res.status(400).json({ error: 'Missing comment_id' });

      // Only allow deleting own comments
      const comments = await supabaseQuery('comments', { filters: `id=eq.${comment_id}&user_id=eq.${userId}` });
      if (comments.length === 0) return res.status(403).json({ error: 'Not your comment' });

      await supabaseQuery('comments', { method: 'DELETE', filters: `id=eq.${comment_id}` });

      // Decrement comments_count
      if (post_id) {
        const posts = await supabaseQuery('posts', { filters: `id=eq.${post_id}`, select: 'comments_count' });
        const newCount = Math.max(0, (posts[0]?.comments_count || 1) - 1);
        await supabaseQuery('posts', { method: 'PATCH', filters: `id=eq.${post_id}`, body: { comments_count: newCount } });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('Feed API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
