# Checklist

An offline-first checklist PWA with groups, repeating tasks, streaks, subtasks, due dates and notes. Data is stored on the device (IndexedDB).

## Develop
```
npm install
npm run dev      # http://localhost:5173, also on your LAN via --host
npm test         # streak / schedule / auto-tick logic
npm run build    # production build to dist/
```
Testing on your phone over Wi‑Fi (`http://<pc-ip>:5173`) works for the UI. Offline mode and installing need HTTPS, though, so deploy to test those properly.

## Deploy to GitHub Pages (free HTTPS)
1. Create a GitHub repo (e.g. `checklist-app`) and push this folder to its `main` branch.
2. In the repo, go to **Settings → Pages → Source** and pick **GitHub Actions**.
3. Each push to `main` runs the tests, builds and deploys to `https://<user>.github.io/<repo>/`.

## Install on your phone
- **Android (Chrome):** open the site, then **⋮ → Add to Home screen / Install app**.
- **iPhone (Safari):** open the site, then **Share → Add to Home Screen**.

After the first load, the app works fully offline. **Export a backup** from Settings now and then. Data lives only on the device.

## Theming
All colours and sizes are CSS variables at the top of `src/theme.css`.

## Structure
- `src/db.ts`: Dexie schema (groups, tasks, completions)
- `src/logic/`: pure logic (dates, schedule rules, streaks, tick/auto-tick)
- `src/data.ts`: reactive data hook and helpers
- `src/pages/`, `src/components/`: UI
- `scripts/gen-icons.mjs`: regenerates the PNG app icons
