# Fitness

A phone-first tracker for the 12-week home gym programme (starts Monday 16 November 2026) with a calorie and protein counter. It is a plain website with no build step, and it installs to the iPhone home screen from Safari.

## What it does

- **Today**: the session that is due, protein and calories so far, and the week's three sessions.
- **Train**: sessions A, B and C with sets, reps, rests and setup notes. It fills in the weights from last time, tells you when to add weight, and runs the rest timer.
- **Food**: quick add, favourites, tap to add again, and a product search (Open Food Facts).
- **Progress**: body weight, waist, heaviest set per lift, sessions by week, and the two review checklists.
- **More**: targets, starting weights (70–75% of the last working weight), sync, backup, and the programme notes.

## Where the data lives

Everything is saved on the device. Optional sync writes it to `data.json` in a private GitHub repo, using a fine-grained token that can only touch that one repo. Set it up under More → Sync.

## Try it on this computer

```bash
node tools/serve.js
```

Then open http://localhost:4173.

## Files

- `index.html`, `styles.css`: the page and its look
- `js/programme.js`: the programme itself (edit this to change exercises, sets or dates)
- `js/app.js`: the screens
- `js/store.js`: saving, backup and GitHub sync
- `sw.js`, `manifest.webmanifest`, `icons/`: home-screen install and offline use
