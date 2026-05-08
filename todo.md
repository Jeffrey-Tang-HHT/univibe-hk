# UniGo HK — Follow-up TODO

Curated post-v10 work, ordered by impact / effort. Items marked
`[shippable]` can be tackled in isolation; `[depends-on:X]` need
another item first.

> **Status note (2026-05-08):** v7 shipped networked emotes,
> AI-powered NPCs, and tap-to-walk in interiors. v8 shipped the
> avatar shadow fix, bench-anchored sit, reduced-motion, long-press
> wave, the remote-player emoji popup, and the v7 schema catch-up
> (`migration-v8-emotes.sql`). v9 shipped the day/night settings
> panel, animated fountain water, distance-culling, LOD trees,
> footprint trails, birds + butterflies, the lucide-react bundle
> split, and housekeeping cleanup. v10 (this drop) shipped the
> weather system, spectator-style first-visit welcome, PWA
> manifest + service worker, auto-translate chat (zh↔en), and a
> minor lucide-react bump. The remaining items below are still open.

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

- [x] **Day/night settings panel** — *shipped in v9*
  New `DayNightSettings.tsx` dialog. Mode radio (real-hk /
  accelerated / fixed), `cycleMinutes` slider (2–30), `fixedHour`
  slider with golden-hour preset buttons (sunrise/noon/sunset/
  midnight), stars on/off toggle, reset. Settings persist to
  `plaza:dayNightSettings` localStorage; v6 `plaza:dayNightMode`
  is migrated forward automatically.

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

- [x] **Animated water on the fountain** — *shipped in v9*
  `Fountain` in `Environment3D.tsx` now renders all three basin
  water discs through a custom shader: two scrolling value-noise
  layers (no texture fetches) drive the ripple, two perpendicular
  sine bands fake caustic sun-glints, and a radial falloff seats
  the water inside each bowl. Same uniforms object shared across
  tiers so the time scroll stays in sync.

- [x] **Weather system** — *shipped in v10*
  Deterministic per-day HK weather rolled from a date hash —
  ~60% clear, ~25% cloudy, ~15% rain. New `weather.ts` (resolver
  + dev override hook), `Weather.tsx` (rain particles that follow
  the player + extra cloud puffs), and `DayNightCycle.tsx`
  extended with `sunMultiplier` + `fogTint` props. Cloudy /
  rainy days dim the sun ×0.7 / ×0.45 and tint fog grey. Small
  HUD pill shows the current weather on non-clear days.

- [x] **Footprint / dust trail** — *shipped in v9*
  `FootprintTrail.tsx` — ring buffer of 24 fading discs allocated
  once, recycled round-robin. New print every 0.55m of travel with
  alternating left/right offset so it reads as a two-foot trail.
  5s hold-then-fade lifecycle. Reads from the shared player position
  bus; mounted only in `PlazaScene.tsx` (outdoor only).

- [x] **Birds + butterflies** — *shipped in v9*
  `AmbientCreatures.tsx` — 4 birds in slow circular orbits at ~6m,
  6 butterflies on Lissajous paths between retargeted anchors. Wing
  flap faked by X-scaling billboard quads (3D rotation would break
  billboard alignment). Birds use the wider AVATAR cull cutoff so
  the sky never feels empty; butterflies cull tighter at AMBIENT.

### Performance

- [x] **Frustum-cull NPCs and other players** — *shipped in v9*
  New `playerPosBus.ts` exports a module-level player position +
  `distSqFromPlayer` helper + `CULL_DIST` thresholds. `NPCs.tsx`
  toggles each NPC's `.visible` against `CULL_DIST.AVATAR` (~40m);
  `OtherPlayers.tsx` does the same for remote players. Behaviour
  state machines still tick for hidden NPCs so they don't visibly
  teleport when re-entering range.

- [x] **LOD for distant trees** — *shipped in v9*
  `InstancedTrees` keeps full geometry near, swaps to a 2-quad
  cross-card billboard past `CULL_DIST.TREE_LOD` (~30m). Reclassify
  runs at 4Hz to avoid flicker right at the cutoff. Trunk cylinder
  stays visible at all distances so silhouettes don't break.

- [ ] **Migrate to WebGPU renderer (with WebGL fallback)**
  Three.js r170+ supports WebGPU. Roughly 30% faster on supported
  devices (current Chrome / Safari Tech Preview). Wrap the `<Canvas>`
  with a try-catch to fall back gracefully.

- [x] **Bundle: split lucide-react imports** — *shipped in v9*
  `vite.config.ts` adds the `lucide-react/icons` → `dist/esm/icons`
  alias; `client/src/lucide.d.ts` declares the module shape; the
  Plaza-track files (`Plaza.tsx`, `JourneyLog.tsx`, `EmoteBar.tsx`)
  now use per-icon `import Icon from 'lucide-react/icons/foo'`
  imports. Non-plaza files keep their barrel imports — Vite still
  tree-shakes those in production.

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

- [x] **Spectator mode for first-time visitors** — *shipped in v10
      (lighter interpretation)*
  Original ask was a no-collision ghost camera for 30s; that's a
  bigger refactor than warranted. Shipped instead: a soft welcome
  card (`SpectatorWelcome.tsx`) that overlays the live scene for
  30s with a countdown, a "Customize now" CTA, and a "Just look
  around" dismiss. Auto-opens AvatarCustomizer when the timer
  expires. Detection: `!user.avatar_config && !localStorage
  .plaza:hasVisited`. Returning users skip it. The component file
  has a comment block explaining the deviation.

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
- [x] **Auto-translate** chat messages between zh/en — *shipped in v10*
  New `api/translate.mjs` (Claude Haiku, HK-Cantonese-flavoured
  zh output, casual student-register en output, 60/user/hour
  rate limit, per-instance LRU cache) + `client/src/lib/translate.ts`
  helper with session cache. Opt-in toggle in the chat panel
  (persisted to `plaza:autoTranslate`). New `<ChatBubbleLine>`
  subcomponent shows `↻` while pending, `(✦)` next to translated
  bubbles, original on hover via `title`. Source-language
  detected by CJK glyph ratio; same-language requests skip the
  API entirely.

---

## 📱 PWA / mobile

- [x] **Add manifest.json + service worker** — *shipped in v10*
  `client/public/manifest.webmanifest` (name, theme-color,
  shortcuts to plaza/feed/dating, three icon refs) and
  `client/public/sw.js` (versioned cache, app-shell pre-cache,
  stale-while-revalidate for navigation, cache-first for hashed
  `/assets/*`, network-only for `/api/*`). Registered in
  `main.tsx` production-only. **Caveat**: the icon PNGs
  themselves (`icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png`) need to be added to `client/public/`
  for a clean install prompt — until then the install prompt
  may show a generic icon.
- [ ] **Push notifications** for new chat messages / matches /
      nearby plaza users.
- [x] **Offline shell** — *partly shipped in v10*
  The service worker pre-caches `/`, `/index.html`, and the
  manifest, and serves the cached shell as a fallback when the
  user navigates while offline. SPA routes still resolve because
  index.html is served for any navigation request. Hashed
  `/assets/*` build artifacts are cached on first fetch so a
  return visit while offline shows the full UI. Not "true"
  offline — `/api/*` is intentionally never cached, so any
  data-driven page (feed, plaza presence, chat) shows empty
  state offline. That's the right tradeoff: stale data is
  worse than no data for those views.

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

- [~] `npm outdated` — partial. v10 bumped `lucide-react`
      `^0.453.0` → `^0.548.0` (all minor within 0.x; the per-icon
      alias is unaffected). **Skipped** the lucide v1.x bump
      (icon renames + alias path may have moved — needs a
      dedicated housekeeping ticket) and **skipped** recharts v2
      → v3 (documented breaking changes in `Customized` and
      `CategoricalChartState`; needs a focused review of the
      analytics/dating pages first). Vitest v3 still pending.
- [x] **Remove `Avatar3D.diff` and `PlayerController.diff`** from the
      repo root — *finally actually shipped in v9*. Marked done in v7
      but the file deletion hadn't been applied to the repo until now.
      The `diffs/` folder still contains historical reference diffs
      from earlier drops; those are intentional archive material.
- [x] **Consolidate `CHANGES_*.md` files** into a single
      `CHANGELOG.md` — *finally actually shipped in v9*. Same story
      as the diff files; the loose `CHANGES_*.md` files were removed
      in v9.

---

## Original v5 to-do (from `todo.md`) — status check

- [x] Login / Signup
- [x] Social Platform Feed
- [x] Dating Page
- [x] Navigation & Buttons

(All four sections from the original `todo.md` are now shipped per
the SECURITY_AUDIT and v3/v4/v5 changelogs.)
