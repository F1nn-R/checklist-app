# CLAUDE.md

Context for Claude sessions working on this project. For setup, deploy and install steps, see `README.md`. Don't duplicate them here.

## What this is
A personal checklist **PWA** used mainly on the owner's phone (installed to the home screen). It works fully offline, and all data lives on the device in IndexedDB. There is no backend, no accounts and no sync.

- Live: https://f1nn-r.github.io/checklist-app/
- Repo: https://github.com/F1nn-R/checklist-app (GitHub username is **F1nn-R** with a digit one, not "Finn-R")
- Every push to `main` runs tests, builds and deploys via `.github/workflows/deploy.yml`, live in about a minute. Pushing to `main` = shipping to the user's phone, so run `npm test` and `npm run build` first.

## Stack
Vite + React 19 + TypeScript, `vite-plugin-pwa` (Workbox, auto-update), Dexie + `dexie-react-hooks`, `react-router-dom` with **HashRouter** (GitHub Pages has no SPA fallback), Vitest + `fake-indexeddb`. Plain CSS with theme tokens in `src/theme.css` (no Tailwind/UI lib).

## Product rules (agreed with the user; don't change without asking)
- **Groups:** tasks can belong to one group or none. Deleting a group keeps its tasks (they become ungrouped).
- **Task fields:** title, description (shown in lists) and **full info** (plain text, no Markdown: too clunky on a phone; shown *only* on the task detail page). No placeholder/example text in the task form's boxes.
- **Start date** is an off-by-default toggle; when off the task starts on the day it was created.
- **Due date** (optional toggle) exists for **one-off tasks only**: a "Due …" label, red when overdue. It doesn't affect when the task shows.
- **Today page** shows only today (no day arrows). Past days live behind the "⋮" menu (top right) on a separate page. There is no browsing of future days; only start/due dates look ahead.
- **Checked one-off tasks** show archive and delete icon buttons on their row (delete is two-tap).
- **Repeats:** once, daily, chosen weekdays, every N days (from the start date) or monthly (day 29–31 clamps to the month's last day).
- **One-off tasks:** shown from the start date until done; once done they show only on the day they were done.
- **Streaks count scheduled days only:** an unscheduled day never breaks a streak. If today is scheduled but not done yet, it doesn't break the streak either. No "skip day" feature (the user chose not to have one).
- **Subtasks:** one level deep only. Each subtask is a full task (own title, description, info) but **inherits the parent's schedule and group** and has no streak of its own in the UI.
  - Ticking all subtasks auto-ticks the parent.
  - Unticking a subtask unticks the parent **only if it was auto-ticked**. This is tracked by `Completion.auto`.
  - The parent can be ticked manually; that never ticks the subtasks.
- **No reminders/notifications** in v1 (PWA limitation; would need a push server or a native app).
- **Dark theme** by default. The user plans to refine the design.

## Code map and conventions
- `src/db.ts`: Dexie schema. Dates are **local `YYYY-MM-DD` strings** everywhere (never `Date` objects in storage) to avoid timezone bugs. Use helpers in `src/logic/dates.ts`.
- `src/logic/`: pure logic: `schedule.ts` (rule matching), `streak.ts`, `completion.ts` (toggle/auto-tick/delete; always use these rather than writing completions directly). Covered by `logic.test.ts`; add tests when changing logic.
- `src/data.ts`: `useData()` loads all groups, tasks and completions reactively into maps (personal-scale data, so this is fine). Helpers: `isDone`, `isDueTop`, `streakInfo`, `useToday` (refreshes at midnight/on focus).
- `src/pages/`, `src/components/`: UI. `ConfirmButton` (tap twice) is used instead of `window.confirm`; keep it that way.
- Per-viewer UI state (expanded tasks, collapsed groups) is in `localStorage`, wrapped in try/catch.

## Gotchas
- **Schema changes:** add a new `this.version(n)` in `db.ts` with an upgrade function. Never edit version 1 in place, or installed copies break. Also bump `VERSION` in `src/backup.ts` and keep importing old backups working.
- **Never change the hosting URL/origin casually.** Browser storage is per-origin, so moving the site (e.g. to Netlify or a custom domain) gives the user an empty app. Migration path: export a backup, install the new URL, import.
- `vite.config.ts` reads `BASE_PATH` (set to `/checklist-app/` in CI). The local dev server uses `/`.
- `useEffect(() => fn())` with an expression body returns a value and crashes React. Use a block body.
- Writing to IndexedDB outside Dexie (e.g. seeding from DevTools) doesn't trigger live queries; reload the page.
- Avoid `alert`/`confirm`/`prompt`: they block browser automation used for testing.
- Line endings: the repo is on Windows; git warns about LF→CRLF. That's harmless.

## Verifying changes
1. `npm test` and `npx tsc -p .`
2. `npm run dev`, then drive the UI in Chrome (claude-in-chrome) and check the console for errors.
3. For PWA/offline changes: `npm run build && npx vite preview`, confirm the service worker is active, stop the server, reload.

## Git & GitHub
- The `gh` CLI is **not installed**. `git push` works via Windows Credential Manager.
- Repo-local identity: `F1nn-R <F1nn-R@users.noreply.github.com>`. Never commit with the user's real email; the repo is public.
- Actions in the GitHub web UI (creating repos, changing settings) may be blocked by the permission classifier. If so, ask the user to click.

## Repo visibility: stays public unless one of these happens
Public is fine **today**: the repo holds only app code (no secrets, no server, no personal data), and the user's tasks never leave their phone. A private repo wouldn't hide the site anyway (the Pages/Netlify URL stays publicly reachable), and free GitHub Pages requires a public repo.

**Revisit going private (e.g. private repo + Netlify, which the user has an account for) only if:**
- the project gains **secrets or a backend**: cloud sync, accounts, API keys or a push-notification server; or
- personal data or anything identifying ends up **in the code or repo** (e.g. hard-coded personal tasks, notes, seed data).

Even then: **secrets never go in the repo, public or private.** Use environment variables or host-level secret settings. If a move is made, remember the origin gotcha above (backup, then reinstall, then import).

## Next steps (the user will give details when ready; ask, don't guess)
1. **Improve the design.** The current dark theme is a functional first pass. Most visual changes start in the `:root` tokens in `src/theme.css`.
2. **Change, improve and add features.** Specifics will come from the user. Check new ideas against the product rules above and confirm any change to them.
3. **Persistent storage (agreed, not built yet).** Call `navigator.storage.persist()` at startup (e.g. in `src/main.tsx`, guarded with `?.` and wrapped in try/catch) so the browser doesn't evict IndexedDB when the phone runs low on storage. It doesn't stop the user from clearing site data manually. Optionally show the result in Settings ("Storage: protected / not protected").

Ideas raised earlier but **not** requested (don't build unprompted): reminders/notifications, drag-to-reorder (currently ↑/↓ buttons), a weekly overview, "skip day" for streaks, cloud sync.
