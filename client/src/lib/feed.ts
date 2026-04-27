// Feed API helper — all feed operations go through /api/feed?action=xxx

const API = '/api/feed';

function authHeaders() {
  const token = localStorage.getItem('unigo_token');
  return { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
}

async function safeFetch(url: string, opts?: RequestInit): Promise<Response> {
  const res = await fetch(url, opts);
  if (res.status === 401) {
    localStorage.removeItem('unigo_token');
    localStorage.removeItem('unigo_user');
    window.location.href = '/login';
  }
  return res;
}

export async function getPosts(category = 'all', limit = 30, offset = 0) {
  const params = new URLSearchParams({ action: 'get-posts', limit: String(limit), offset: String(offset) });
  if (category !== 'all') params.set('category', category);
  const res = await fetch(`${API}?${params}`, { headers: authHeaders() });
  return res.json();
}

export async function createPost(data: {
  content: string;
  category?: string;
  privacy_mode?: string;
  image_url?: string;
  poll_question?: string;
  poll_options?: string[];
}) {
  const res = await safeFetch(`${API}?action=create-post`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function togglePostLike(postId: string) {
  const res = await safeFetch(`${API}?action=toggle-like`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ post_id: postId }),
  });
  return res.json();
}

export async function votePoll(postId: string, optionIndex: number) {
  const res = await safeFetch(`${API}?action=vote-poll`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ post_id: postId, option_index: optionIndex }),
  });
  return res.json();
}

export async function getComments(postId: string) {
  const res = await fetch(`${API}?action=get-comments&post_id=${encodeURIComponent(postId)}`, { headers: authHeaders() });
  return res.json();
}

export async function addComment(postId: string, content: string, privacyMode = 'ghost') {
  const res = await safeFetch(`${API}?action=add-comment`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ post_id: postId, content, privacy_mode: privacyMode }),
  });
  return res.json();
}

export async function deleteComment(commentId: string, postId: string) {
  const res = await safeFetch(`${API}?action=delete-comment`, {
    method: 'DELETE', headers: authHeaders(),
    body: JSON.stringify({ comment_id: commentId, post_id: postId }),
  });
  return res.json();
}

export async function deletePost(postId: string) {
  const res = await safeFetch(`${API}?action=delete-post`, {
    method: 'DELETE', headers: authHeaders(),
    body: JSON.stringify({ post_id: postId }),
  });
  return res.json();
}

export async function reportPost(postId: string, reason: string) {
  const res = await safeFetch(`${API}?action=report-post`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ post_id: postId, reason }),
  });
  return res.json();
}
