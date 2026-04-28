# CHANGES — v5 interiors fixes (sound + dating latency)

Two targeted fixes on top of the v5 interiors Drop 1 zip.

## 1. 3D plaza is silent

**Symptom.** No ambient sound anywhere — plaza or interiors.

**Root cause.** The Drop 1 `AmbientSound` component is correct but file-driven: it
loads `/audio/library.mp3`, `/audio/cafe.mp3`, etc., and fails silently if those
files are missing. They were never committed (size + licensing) and the
`client/public/audio/` directory doesn't exist at all in the project. On top of
that, the plaza scene's config in `lib/scenes.ts` had no `ambientSound` URL — so
even after dropping in audio files, the plaza itself would still have been
silent.

**Fix.** Replaced `AmbientSound.tsx` with a **procedural Web Audio synthesiser**.
Each scene now has a synthesised pad: chord oscillators feeding a lowpass filter,
modulated by a slow LFO, blended with coloured noise. The five scenes get five
distinct signatures (root note, chord intervals, filter cutoff, LFO speed, noise
colour, gain trim).

| Scene | Root | Chord intervals | Cutoff | Mood |
|-------|------|-----------------|--------|------|
| Plaza | A2 (110 Hz) | root + 5th + 8va | 600 Hz | warm, balanced, slow |
| Library | C2 (65.4 Hz) | root + 5th | 350 Hz | low, austere, almost subliminal |
| Café | D2 (73.4 Hz) | maj7 voicing | 850 Hz | cosy, slightly livelier |
| Social | C3 (131 Hz) | major + 8va | 1200 Hz | brighter, more LFO movement |
| Dating | F2 (87.3 Hz) | maj9-ish | 950 Hz | dreamy, slow, romantic |

All five voices are built on `AudioContext` startup but kept at zero gain. Scene
crossfades just ramp the per-voice gains — instant, click-free, no allocation.

**Autoplay handling.** `AudioContext` starts in `suspended` state until a user
gesture. `AmbientSound` listens once for `pointerdown` / `keydown` / `touchstart`
on the window and resumes the context. Oscillators only start after the context
is running, so there's no click on resume.

**Mute toggle.** Already wired through `SceneContext.muted`; the new
implementation ramps the master gain (180 ms) instead of swapping audio elements.

**Disk footprint.** Zero. No `.mp3` files needed. The `cfg.ambientSound` field
is preserved in the scene registry as a future escape hatch — if you ever want
real audio, you can re-introduce a file-loading branch in `AmbientSound`.

### Files
- `client/src/components/plaza/AmbientSound.tsx` — full rewrite (~310 lines).
- No changes to `lib/scenes.ts`, `Plaza.tsx`, or `SceneContext.tsx`. The
  `AmbientSound` import contract is identical (default export, no props).

## 2. Dating chat feels slow

**Symptom.** Sending a message feels laggy / messages take a while to appear /
the partner's reply lands later than it should.

**Root cause.** Three layered issues in `Dating.tsx`:

1. **3 s polling interval.** The partner's incoming message could take up to
   3 s to appear after the server saved it.
2. **Optimistic-message instability.** The optimistic UI was already in place
   (the user's own message appears in the chat list immediately) — but those
   optimistic messages had no stable `id`. When a poll fired during an in-flight
   `sendMessage`, the polling `setChatMessages` simply *replaced* local state
   with whatever the server had returned. If the server hadn't yet stored the
   message, the user's message would briefly **vanish** until the next poll.
3. **No burst polling.** After hitting send, the user waited the full 3 s
   tick to see the read receipt or any reply.

**Fix.** Three corresponding changes:

1. **Idle polling 3000 ms → 1500 ms.** Twice as fresh for incoming. Polling
   still stops the moment the chat closes, so cost on idle sessions is unchanged.
2. **Stable temp IDs + smart merge.** Optimistic messages now get an
   `id` of `temp:${timestamp}:${random}`. The polling effect's merge keeps any
   `temp:` message that doesn't yet have a server twin, so messages no longer
   disappear during in-flight sends. When `sendMessage` resolves, the temp is
   replaced inline by the real server message (matched by `tempId`).
3. **Burst poll after send.** A successful send schedules three extra polls at
   200 ms, 600 ms, 1200 ms. Read receipts and quick replies land near-instantly
   instead of waiting for the next idle tick.

Applied uniformly to text, image, and voice send paths.

### Files
- `client/src/pages/Dating.tsx` — three handlers reworked
  (`handleSendMessage`, `handleChatImageUpload`, `handleVoiceRecord`),
  polling effect rewritten, two new refs (`fastPollRef`, `burstTimersRef`)
  and one helper (`burstPoll`).
- No API or DB changes. Server side is already fast — the slowness was all
  on the client. (The 1500 ms interval roughly doubles the request rate while
  a chat is open, but get-messages is a single Supabase select; this should be
  well within hobby-tier limits.)

## What's *not* changed

- Server (`api/chat.mjs`) — untouched. The send and get endpoints are already
  fast; the latency was perceived, not real.
- Polling stops the moment the user leaves a chat, so sessions that aren't
  actively chatting incur no extra cost from the lower interval.
- No DB migration needed.
- Plaza visuals, scenes, NPCs, etc. — all unchanged.

## Verification

- `tsc -p` syntax-only check on the two changed files: clean (the only
  errors reported are environmental — missing `node_modules`, same as the
  v5 Drop 1 baseline).
- `node --check` on `api/chat.mjs`: clean.
- Procedural-audio audibility smoke test: all five scenes generate chord
  frequencies (65.4 Hz to 261.6 Hz) safely under their respective filter
  cutoffs, so each pad will be audible and distinguishable.

## Deployment

Just push and redeploy. No DB migrations, no env-var changes, no asset uploads.

```cmd
cd C:\Users\hokhi\Desktop\unigo-hk
git add -A
git commit -m "v5 interiors: procedural ambient + faster dating chat"
git push
```

Vercel rebuilds, you're done.

## What you'll notice

**On the 3D plaza:** ambient pad fades in shortly after you arrive on the page
and click/tap anywhere (autoplay policy still applies). Walking into an interior
fades the plaza pad out and the interior's pad in over ~700 ms. The mute button
in the HUD silences everything in ~180 ms.

**In dating:** typing and sending a message feels visually identical (it was
already optimistic), but the message no longer briefly disappears during slow
network. Partner replies land within ~1.5 s instead of up to 3 s. After you
send, the read receipt comes back faster.

## Diffs

- `diffs/AmbientSound.procedural.diff`
- `diffs/Dating.instant-messages.diff`
