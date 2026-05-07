# UniGo HK — v6 Upgrade Drop

**Day/Night Cycle · Emotes · Tap-to-Walk · Pinch Zoom · Polished Loader**

## What you got

```
unigo-hk-v6/
├── README.md                                    ← (this file)
├── CHANGES_v6_daynight_emotes.md                ← full write-up of every change
├── todo.md                                      ← follow-up roadmap
└── client/src/
    ├── App.tsx                                  ← MODIFIED (uses PlazaLoader)
    ├── components/plaza/
    │   ├── DayNightCycle.tsx                    ← NEW
    │   ├── EmoteBar.tsx                         ← NEW
    │   ├── TapToWalk.tsx                        ← NEW
    │   ├── PlazaLoader.tsx                      ← NEW
    │   ├── Avatar3D.tsx                         ← MODIFIED (emote system)
    │   ├── PlayerController.tsx                 ← MODIFIED (emote + zoom refs)
    │   ├── Environment3D.tsx                    ← MODIFIED (sky removed)
    │   ├── SceneRouter.tsx                      ← MODIFIED (forwards onSetWaypoint)
    │   └── scenes/
    │       └── PlazaScene.tsx                   ← MODIFIED (mounts TapToWalk)
    └── pages/
        └── Plaza.tsx                            ← MODIFIED (everything wired)
```

## Install

From your repo root (the folder with `package.json`):

```bash
unzip -o unigo-hk-v6-daynight-emotes.zip
git add -A
git commit -m "v6: day/night cycle + emotes + tap-to-walk + pinch zoom"
git push
```

That's it. **No DB migration. No new dependencies. No env-var changes.**
Vercel rebuilds and you're done.

## Try it

1. Visit `/plaza` while logged in.
2. **Top-right HUD** — look for the new clock icon. Tap to cycle:
   real HK time → 8-min accelerated cycle → fixed midday.
3. **Right side, above the joystick** — smile button. Tap to expand
   emotes. Try 👋 wave, 💃 dance, 🙌 cheer.
4. **Click any patch of grass** (or double-tap on mobile). Avatar
   walks there.
5. **Scroll wheel** (or pinch on mobile) — camera zoom.

## Read the docs

- `CHANGES_v6_daynight_emotes.md` — what changed and why, file by file.
- `todo.md` — what's queued next, ordered by impact.
