# UniGo HK — Follow-up TODO

Curated post-v6 work, ordered by impact / effort. Items marked
`[shippable]` can be tackled in isolation; `[depends-on:X]` need
another item first.

---

## 🎮 3D Plaza — next plaza-track items

### High impact

- [ ] **Networked emotes** `[shippable]`
  Right now emotes are local-only. Other players don't see your wave.
  Plan:
  1. Extend the position broadcast in `lib/plaza.ts` (`updatePosition`)
     to include `{ emote: string | null, emoteStartMs: number }`.
  2. Server-side (`api/plaza.mjs`) — store in the player heartbeat
     row, return in the `getPlayers` response.
  3. `OtherPlayers.tsx` — pass `emote` / `emoteStartMs` props down to
     `<Avatar3D>` (already supported in v6).
  4. Add a 5-second TTL: the server clears `emote` if `emoteStartMs`
     is older than the longest emote duration (~4s) plus a small
     buffer, so emotes don't get stuck on disconnected players.
  Estimated: 2–3 hours.

- [ ] **AI-powered NPCs** `[shippable]`
  Replace the canned NPC dialogue in `NPCs.tsx` with on-demand
  Claude API calls.
  Plan:
  1. New `api/npc-chat.mjs` Vercel function — takes `{ npcId, prompt,
     history }`, returns Claude completion. Apply the existing rate
     limiter (10 / user / hour is a good start).
  2. Each NPC gets a personality preamble (system prompt). Store the
     personalities in `client/src/components/plaza/NPCs.tsx` next to
     the existing NPC defs.
  3. Click an NPC → opens a small chat panel (style after the player
     chat bubble). User messages route through the new endpoint.
  4. Conversation history stays client-side (no DB) for privacy +
     simplicity. Resets on plaza reload.
  Estimated: 1 day.

- [ ] **Day/night settings panel** `[depends-on: settings menu skeleton]`
  Right now the day/night mode is a single icon that cycles through
  three options. Replace with a proper settings panel that lets the
  user:
  - Pick mode (radio: real-hk / accelerated / fixed)
  - Adjust accelerated cycle length (slider, 2–30 minutes)
  - Pick fixed hour (slider, 0–24)
  - Toggle stars at night
  Integrate into the existing AvatarCustomizer dialog as a second
  tab, or create a new "Plaza Settings" dialog.

- [ ] **Sit emote: anchor to benches** `[shippable]`
  v6 sit emote just lowers the avatar in place. Make it snap to the
  nearest bench (within 1.5m) when triggered, so players actually
  appear to be sitting on something. Bench positions are in
  `Environment3D.tsx` / `ZoneLandmarks.tsx`.

- [ ] **Avatar shadow during sit emote**
  When `bodyY < 0`, the avatar's shadow disc clips into the ground.
  Move the shadow disc to be a sibling of the avatar group (anchored
  to world y=0.01) instead of a child, OR scale + fade the shadow
  with body height.

### Visual / world

- [ ] **Replace hand-coded buildings with GLB models**
  `ZoneLandmarks.tsx` is 46KB of primitives. Swap a few for proper
  GLB models from Sketchfab CC0 / Poly Haven. Use `useGLTF` from
  `@react-three/drei`. Aim: keep total models <2MB by using draco
  compression.

- [ ] **Animated water on the fountain**
  The central fountain is static. Add a flowing-water shader to the
  basin (Perlin noise + UV scrolling) and a small particle stream.
  Reference: `FountainCallout.tsx` already exists for the labels.

- [ ] **Weather system**
  Optional per-day weather: clear / cloudy / light rain. Cloudy =
  more `CLOUD_POSITIONS` rendered + sun intensity ×0.7. Rain = a
  `<Points>` rain particle system + slight fog colour shift.
  Could roll a daily seed off the date so all players see the same
  weather on the same day.

- [ ] **Footprint / dust trail**
  When the avatar walks on dirt zones, leave faint footprints that
  fade after 5 seconds. Keep the count low — instanced quads work
  well here.

- [ ] **Birds + butterflies**
  Small 2D sprite ambient creatures that path between trees. Pure
  decoration, but huge "alive world" feel.

### Performance

- [ ] **Frustum-cull NPCs and other players**
  All NPCs render every frame regardless of camera position. Use the
  player's position + a simple distance cutoff (40m) to skip rendering
  NPCs that are off-camera. Reduces draw calls on busy plazas.

- [ ] **LOD for distant trees**
  Trees beyond 30m can use a simple billboard sprite instead of full
  geometry. Three.js `LOD` makes this trivial.

- [ ] **Migrate to WebGPU renderer (with WebGL fallback)**
  Three.js r170+ supports WebGPU. Roughly 30% faster on supported
  devices (current Chrome / Safari Tech Preview). Wrap the `<Canvas>`
  with a try-catch to fall back gracefully.

- [ ] **Bundle: split lucide-react imports**
  `import { ... } from 'lucide-react'` pulls in the full barrel.
  Use `import Icon from 'lucide-react/icons/icon-name'` for the
  Plaza-specific icons to drop ~80 KB from the chunk.

### Multiplayer

- [ ] **Proximity voice chat (WebRTC)**
  When 2+ players are within 8m, open a peer-to-peer voice channel.
  Library: `simple-peer`. Signalling via your existing Supabase
  Realtime channels. Mute toggle per-pair, plus a global mute in
  the HUD.

- [ ] **Player gestures broadcast** `[depends-on: networked emotes]`
  Once emotes broadcast, add reactive emojis above the avatar's head
  (already a pattern in `OtherPlayers.tsx` for chat bubbles).

- [ ] **Spectator mode for first-time visitors**
  Brand-new users (no avatar saved) drop into a no-collision, ghost
  camera that watches the plaza for 30 seconds before being prompted
  to customize their avatar. Reduces first-impression bounce.

### Mobile

- [ ] **Tap-to-walk inside interiors** `[shippable]`
  v6 only mounts `TapToWalk` in the outdoor `PlazaScene`. Add it to
  `InteriorScene` too — the same plumbing should work, just place
  the catcher to match each interior's bounds.

- [ ] **Long-press emote shortcut**
  Long-press the joystick = play "wave" emote. No need to open the
  emote bar for the most common gesture.

- [ ] **Reduced-motion / accessibility mode**
  Some students get motion sickness from the bouncy walk cycle.
  Respect `prefers-reduced-motion` in `Avatar3D.tsx` (skip body
  bounce, halve walk amplitudes) and reduce camera follow lerp.

---

## 🔒 Security (from your own SECURITY_AUDIT.md backlog)

- [ ] **Tighten Supabase RLS policies** — currently `USING (true)`.
- [ ] **Move rate limiter from in-memory → Upstash Redis** (current
      one resets on every Vercel cold start).
- [ ] **Add account lockout** after N failed logins.
- [ ] **Content moderation API** for posts / messages (OpenAI mod
      endpoint is free).
- [ ] **Structured logging + monitoring** for failed auth, rate
      limit hits.

---

## 🤖 AI features

- [ ] **AI study buddy** in Study Zone (Claude API).
- [ ] **Smart matchmaking** in Dating — embeddings-based compatibility
      scoring on top of MBTI.
- [ ] **Auto-translate** chat messages between zh/en (you already
      have `LanguageContext`).

---

## 📱 PWA / mobile

- [ ] **Add manifest.json + service worker** so `.edu.hk` students
      can install the app.
- [ ] **Push notifications** for new chat messages / matches /
      nearby plaza users.
- [ ] **Offline shell** — landing page renders from cache so the app
      never shows a connection error on first load.

---

## 📊 Analytics & growth

- [ ] **PostHog or Plausible** event tracking — what zones do
      students visit? Where do they drop off?
- [ ] **Referral system** — invite a friend from same `.edu.hk`,
      both get a Pro week.
- [ ] **Weekly campus digest email** (you have email infra
      already).

---

## ⚙️ Tech stack housekeeping

- [ ] `npm outdated` — bump `lucide-react` (0.453 → latest), `recharts`
      v2 → v3, `vitest` v2 → v3.
- [ ] **Remove `Avatar3D.diff` and `PlayerController.diff`** from the
      repo root — these are leftovers from older drops; the
      authoritative code is in `client/src/components/plaza/`.
- [ ] **Consolidate `CHANGES_*.md` files** into a single `CHANGELOG.md`.

---

## Original v5 to-do (from `todo.md`) — status check

- [x] Login / Signup
- [x] Social Platform Feed
- [x] Dating Page
- [x] Navigation & Buttons

(All four sections from the original `todo.md` are now shipped per
the SECURITY_AUDIT and v3/v4/v5 changelogs.)
