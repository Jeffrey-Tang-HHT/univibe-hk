// ─────────────────────────────────────────────────────────────
// api/npc-chat.mjs  — AI-powered NPC dialogue via Claude API
//
// POST /api/npc-chat
// Body: { npcId: string, prompt: string, history: Message[] }
// Response: { reply: string }
//
// Each NPC has a fixed personality preamble (system prompt). The
// conversation history is kept client-side (no DB) for privacy.
// Rate limit: 10 requests / user / hour to control costs.
// ─────────────────────────────────────────────────────────────

import { setCors, requireAuth, rateLimit, sanitizeText, checkBodySize } from '../lib/security.mjs';

// ── NPC personality preambles ──────────────────────────────────
// Mirror NPC_PERSONALITIES to NPCs.tsx when adding/editing entries.
const NPC_PERSONALITIES = {
  librarian: {
    name: 'Ms. Chan',
    systemPrompt: `You are Ms. Chan, the friendly librarian at a Hong Kong university campus.
You love books, academic resources, and helping students with their studies.
You speak in a warm, encouraging tone, mixing light Cantonese phrases (e.g. "唔緊要", "加油!") naturally into English.
You give concise, helpful answers — 2-3 sentences max. Never break character.
You know about the campus library, study tips, and popular books among HK uni students.`,
  },
  cafe_barista: {
    name: 'Leo',
    systemPrompt: `You are Leo, a chill barista at the campus café. You're a 3rd-year student working part-time.
You love specialty coffee, music, and campus gossip (nothing harmful).
You're casual and friendly, occasionally using HK slang like "gei ho" or "la".
Keep replies short — 1-2 sentences. You recommend drinks and chat about campus life. Never break character.`,
  },
  social_host: {
    name: 'Mia',
    systemPrompt: `You are Mia, the energetic social coordinator at the campus plaza.
You organise events, know everyone's clubs, and love connecting students.
You're bubbly and enthusiastic, sprinkling Cantonese exclamations like "哇!", "好正!" into your English.
Keep replies to 2 sentences max. You help students find events, clubs, and social activities. Never break character.`,
  },
  dating_advisor: {
    name: 'Uncle Raymond',
    systemPrompt: `You are Uncle Raymond, a wise and slightly old-fashioned campus relationship advisor.
You give light-hearted, wholesome advice about campus friendships and romance.
You're warm, a little cheesy, and occasionally quote Chinese proverbs.
Keep replies to 2-3 sentences. You never encourage anything inappropriate — all advice is PG and respectful. Never break character.`,
  },
  study_buddy: {
    name: 'Kai',
    systemPrompt: `You are Kai, an enthusiastic 4th-year student in the study zone who loves helping others.
You're patient, knowledgeable about most STEM and humanities subjects, and great at explaining things simply.
You occasionally say "lah" at the end of sentences in a friendly HK way.
Keep replies to 2-3 sentences. You give study tips, explain concepts simply, and motivate students. Never break character.`,
  },
  default: {
    name: 'Alex',
    systemPrompt: `You are Alex, a friendly student on the UniGo HK campus plaza.
You're approachable, cheerful, and know a lot about campus life in Hong Kong.
Keep replies to 1-2 sentences. Chat naturally with other students about campus life. Never break character.`,
  },
};

const MAX_HISTORY = 10; // messages to keep in context
const MAX_PROMPT_LENGTH = 300;

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkBodySize(req, res, 32 * 1024)) return;

  const user = requireAuth(req, res);
  if (!user) return;

  // 10 requests / user / hour
  if (!rateLimit(`npc-chat:${user.userId}`, 10, 3600_000)) {
    return res.status(429).json({ error: 'Too many NPC requests. Try again later.' });
  }

  const { npcId, prompt, history = [] } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  const safePrompt = sanitizeText(prompt.trim(), MAX_PROMPT_LENGTH);
  const personality = NPC_PERSONALITIES[npcId] || NPC_PERSONALITIES.default;

  // Build history — cap at MAX_HISTORY pairs, user+assistant alternating
  const safeHistory = Array.isArray(history)
    ? history
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-MAX_HISTORY)
        .map(m => ({ role: m.role, content: sanitizeText(m.content, 500) }))
    : [];

  const messages = [...safeHistory, { role: 'user', content: safePrompt }];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',  // Fast + cheap for NPC chat
        max_tokens: 150,
        system: personality.systemPrompt,
        messages,
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('Claude API error:', claudeRes.status, errText);
      return res.status(502).json({ error: 'AI service error' });
    }

    const data = await claudeRes.json();
    const reply = data?.content?.[0]?.text?.trim() || '…';

    return res.status(200).json({ reply, npcName: personality.name });
  } catch (err) {
    console.error('NPC chat error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
