# CLAUDE.md — @roadmate/mobile

The RoadMate app: **Expo (React Native) + TypeScript**, expo-router,
TanStack Query, Zustand. Maps via `react-native-maps`, location via
`expo-location` (incl. background), push via `expo-notifications`.

> Frontend is React Native (not web React) on purpose: the product depends on
> push notifications and background location, which a web app can't do reliably.
> It's still React + TypeScript, consistent with the hydra stack.

## Commands

```bash
bun run start     # expo dev server
bun run ios       # run on iOS
bun run android   # run on Android
```

## Layout

```
app/                 # expo-router screens (file-based routing)
├── _layout.tsx      # providers (react-query) + root stack
├── index.tsx        # home (map + "need help" + "available" toggle)
└── (tabs)/          # main tabs once authed
src/
├── components/      # reusable UI
├── features/        # auth, requests, helper-mode, chat
├── lib/             # api client, supabase client, push, location
├── hooks/           # shared hooks
└── store/           # zustand stores (e.g. helper availability)
assets/              # icons, images
```

## Key concerns

- **Background location** only while "available to help" is ON; throttle to save
  battery (significant-change / periodic, not continuous).
- **Push registration** on login; send the Expo push token to the backend.
- Shared request/enum contracts come from `@roadmate/shared` (zod).
