# Texora Demo Tracker

Sales and demo tracker for Texora: leads, follow-ups, call log, demos, agenda, reports, clients and masters.
Vite + TypeScript, Firebase Firestore for live data, hosted on GitHub Pages.

Live: https://rushikambl.github.io/texora-demo-tracker/

## Run it

```bash
npm install
npm run dev        # local dev server with hot reload
npm run build      # typecheck + production build into docs/
npm test           # unit tests (Vitest)
```

Browser smoke test (fake Firebase, no real data touched):

```bash
npx vite build --mode e2e && python3 tests/e2e/smoke.py
```

## Deploy

GitHub Pages serves the `docs/` folder on `main`.
Run `npm run build`, commit the updated `docs/`, and push. The site updates in about a minute.

## Screens and shortcuts

- Phone: bottom tabs, bottom sheets with a sticky Save bar, filters folded behind "Filters & sort".
- Desktop (1024px and wider): left sidebar, leads as a table, forms and lead details in a right-hand drawer.
- Keyboard (desktop, same scheme as TradeJournal): `N` new lead, `/` search, `D` Today, `L` Leads, `A` Agenda,
  `R` Reports, `C` Clients, `M` Masters, `J`/`K` move through leads, `Enter` open, inside a lead `E` edit,
  `G` log call, `U` update status, Reports `1` `2` `9` `0` for the period, `?` shows the list, `Esc` closes.

## Install as an app

The site is a PWA (manifest + service worker + icons in `public/`), so phones offer to install it:
- Android (Chrome): menu ⋮ → **Install app** (or the install banner).
- iPhone (Safari): Share → **Add to Home Screen**.
It opens full screen with its own icon, and Firestore's offline cache shows the last data without signal.
Long-press the icon for shortcuts: **New lead** and **Agenda**.

## Project structure

```
index.html              page markup (no inline JS; buttons declare data-action)
public/                 icons, manifest, service worker, .nojekyll (copied into docs/ on build)
src/
  main.ts               entry: styles, Firestore listeners, render loop
  pwa.ts                service worker registration, home-screen shortcut links
  config.ts             Firebase config, user and company name
  types.ts              Lead, Master, Activity types
  state.ts              in-memory store shared by views
  data/
    firebase.ts         all Firestore reads and writes
    masterSync.ts       keeps masters in step with names used on leads
  domain/               pure logic, unit tested
    leads.ts            statuses, next action, maintenance, stage stamps
    masters.ts          master types, usage, rename/remove cascade
    reports.ts          period ranges, funnel, win rate, sources, reasons
    csv.ts              CSV export
  ui/
    actions.ts          event delegation (data-action / data-change / data-input / data-enter)
    sheets.ts           bottom sheets: open/close, focus trap, Escape, validation, busy state
    components.ts       lead rows, tags, segmented controls
    toast.ts            notifications and error reporting
    shortcuts.ts        keyboard shortcuts and the shortcuts list
  views/                one file per tab: today, leads, agenda, reports, clients, masters, nav
  sheets/               lead form, lead detail, status update, call log, master edit
  utils/                dates, formatting, DOM helpers
  styles/               tokens, base, layout, components, views, responsive (phone + desktop layouts)
tests/
  domain.test.ts        unit tests for logic
  e2e/                  Firebase fake + Playwright smoke test
docs/                   built site (served by GitHub Pages)
```

## Data (Firestore)

- `leads/{id}`: name, phone, company, city, email, accountant, current software (`curSw`, "Equal + Chandni"),
  business type, interested-in software, source, reference giver, temperature, expected value, status,
  demo date/time/type/place, follow-up date, won amount/payment/closing date, reject reason, activity timeline (`act`).
- `masters/{id}`: `t` (`acc` accountant, `ref` reference giver, `sw` software, `biz` business type), `name`, `phone`.

Firestore rules currently allow open read/write on `leads` and `masters` (no login).

## Adding a feature

1. Logic goes in `src/domain/` with a test in `tests/`.
2. Markup goes in `index.html` or a view/sheet template; buttons use `data-action="name"`.
3. Register the handler with `on({ name: (el) => … })` in the module that owns it.
4. Run `npm run build`, `npm test` and the e2e smoke test before pushing.
