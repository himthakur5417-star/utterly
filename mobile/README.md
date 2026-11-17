# Utterly Mobile

Native **iOS / Android** app for Utterly, built with **Expo (React Native)** and
**expo-router**. It talks to the exact same backend API as the web app, so your
users get the same dashboard, invoices, AI recovery engine, and client data on
their phone.

## Requirements

- Node 18+ (LTS)
- The web backend running (see root `README.md`). The mobile app is just a thin
  client over that API.

## Setup

```bash
cd mobile
# Expo projects install most reliably with pnpm (via corepack):
corepack pnpm install

# or, if you prefer npm:
# npm install
```

### Point the app at your backend

The app reads the API base URL from `EXPO_PUBLIC_API_URL`.

```bash
# Backend on the same machine (iOS simulator / Android emulator)
EXPO_PUBLIC_API_URL=http://localhost:3000 npm start

# Physical device — use your computer's LAN IP, e.g.
# EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 npm start
```

> The API is the same as the web app's — `POST /api/auth/login`, `GET /api/dashboard/stats`,
> `GET /api/recovery/overview`, `POST /api/ai/ask`, `GET /api/invoices`, `GET /api/clients`, etc.
> Authentication uses the backend's session cookie, which the app captures and
> resends automatically on every request.

## Running

```bash
npm run ios      # iOS simulator (macOS only)
npm run android  # Android emulator/device
npm start        # interactive: press i/a/w
npm run web      # run as a web app (optional)
```

## Structure

```
app/                # expo-router routes
  index.tsx         # welcome screen
  login.tsx / signup.tsx
  dashboard.tsx     # stats + charts + alerts
  invoices.tsx      # list + create + filter
  invoices/[id].tsx # detail + mark paid/sent
  recovery.tsx      # overdue buckets + AI assistant
  clients.tsx       # client list + add
  settings.tsx      # account + plan + logout
components/         # reusable UI (Screen, Card, Button, Field, Badge, Chart, ListRow, AppShell)
lib/                # api client (cookie sessions), auth context, theme, formatters
```

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | yes | Backend base URL, e.g. `http://localhost:3000` |

## Notes on package manager

The app is locked with `pnpm-lock.yaml` (installed via corepack). If you use
npm, run `npm install` fresh rather than on top of an existing `node_modules`.
`query-string@8` is pinned deliberately because newer versions use JS features
unsupported by the Hermes runtime bundled with React Native 0.76.

## Notes

- Session cookies are stored securely via `AsyncStorage` and attached to every
  request; logging out clears them.
- The AI assistant runs in **demo mode** until the backend has real OpenAI keys.
- This is a client only — all business logic, auth, payments, and data live in
  the web backend and are isolated per user.
