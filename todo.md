# UniGo HK — Follow-up TODO

Curated post-v8 work, ordered by impact / effort. Items marked
`[shippable]` can be tackled in isolation; `[depends-on:X]` need
another item first.

> **Status note (2026-05-08):** v7 shipped networked emotes,
> AI-powered NPCs, and tap-to-walk in interiors (the v7 entry in
> `CHANGELOG.md` covers details; the corresponding `migration-v8-emotes.sql`
> shipped in v8 to catch up the schema). v8 then shipped the avatar
> shadow fix, bench-anchored sit, reduced-motion, long-press wave,
> and the remote-player emoji popup. The remaining items below are
> still open.

---

## 🎮 3D Plaza — next plaza-track items

### High impact

- [x] **Networked emotes** `[shippable]` — *shipped in v7*
  Emotes now broadcast to all players in the same scene; 5-second
  TTL prevents stuck emotes on disconnected players. Schema migration
  shipped in v8 (`migration-v8-emotes.sql`).

- [x] **AI-powered NPCs** `[shippable]` — *shipped in v7*
  `api/npc-chat.mjs` plus five personality preambles (Ms. Chan, Leo,
  Mia, Uncle Raymond, Kai). 10 req/user/hour rate limit,
  client-side history, click-to-chat panel.

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

- [x] **Sit emote: anchor to benches** `[shippable]` — *shipped in v8*
  New `benches.ts` module with `findNearestBench`. `PlayerController`
  snaps the player to the closest bench within 1.5m on sit-emote
  start, plus rotates to match the bench's facing.

- [x] **Avatar shadow during sit emote** — *shipped in v8*
  Shadow disc now counters the group's y-offset each frame so it
  stays anchored to world y ≈ 0.01, with subtle scale + opacity
  ramp tied to body height.

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

- [x] **Player gestures broadcast** `[depends-on: networked emotes]` — *shipped in v8*
  Reactive emoji popup above the avatar's head when an emote is
  active. Drei `<Html>` for proper colour-emoji rendering;
  pop-in / hold / fade lifecycle keyed off the emote's duration.

- [ ] **Spectator mode for first-time visitors**
  Brand-new users (no avatar saved) drop into a no-collision, ghost
  camera that watches the plaza for 30 seconds before being prompted
  to customize their avatar. Reduces first-impression bounce.

### Mobile

- [x] **Tap-to-walk inside interiors** `[shippable]` — *shipped in v7*
  `InteriorScene.tsx` now mounts `<TapToWalk>` clamped to the
  scene bounds; `SceneRouter.tsx` forwards `onSetWaypoint`.

- [x] **Long-press emote shortcut** — *shipped in v8*
  `VirtualJoystick` exposes `onLongPress` + `longPressMs` (default
  500ms). 8px dead-zone; press is consumed once fired so dragging
  back to centre doesn't retrigger. `Plaza.tsx` plays "wave".

- [x] **Reduced-motion / accessibility mode** — *shipped in v8*
  `Avatar3D.tsx` reads `(prefers-reduced-motion: reduce)` via
  matchMedia (Safari < 14 fallback included). Halves bounce/swing;
  emotes unaffected (opt-in user gesture).

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
  *Note:* infrastructure already in place — `api/npc-chat.mjs` with
  the `study_buddy` (Kai) personality is the obvious starting point;
  the gap is a dedicated study-zone UI hooked into it.
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
- [x] **Remove `Avatar3D.diff` and `PlayerController.diff`** from the
      repo root — *shipped in v7*. (The `diffs/` folder still
      contains historical reference diffs from earlier drops; those
      are intentional archive material, not stale code.)
- [x] **Consolidate `CHANGES_*.md` files** into a single
      `CHANGELOG.md` — *shipped in v7*.

---

## Original v5 to-do (from `todo.md`) — status check

- [x] Login / Signup
- [x] Social Platform Feed
- [x] Dating Page
- [x] Navigation & Buttons

(All four sections from the original `todo.md` are now shipped per
the SECURITY_AUDIT and v3/v4/v5 changelogs.)
