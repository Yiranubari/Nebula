# Nebula Frontend

This is the React app that people actually look at and click on. It talks to the [server](../server/README.md) for everything: messages, tasks, notifications, video call signaling, the lot.

## What's in here

- React 19 with TypeScript
- Vite for the dev server and the production build
- Tailwind for styling, with a dark and light theme
- React Router for navigation
- Socket.IO client for the real-time stuff (chat, notifications, presence)
- simple-peer for WebRTC video and audio calls
- axios for plain HTTP requests
- recharts for the small charts on the dashboard
- react-hot-toast for the little notification popups

## The pages

Each file in `src/pages/` is a top-level route:

- `Landing.tsx` is the public page anyone can visit
- `Login.tsx` and `Signup.tsx` handle account creation and sign-in, including OTP verification and password reset
- `Dashboard.tsx` is what you land on after signing in
- `Chat.tsx` is the group chat
- `Inbox.tsx` is your direct messages
- `TaskBoard.tsx` is the drag-and-drop board
- `Huddles.tsx` is the voice and video calls
- `Notifications.tsx` is the running feed of things that happened
- `Profile.tsx` and `Members.tsx` are user-facing settings and the team list
- `AdminPanel.tsx` is where admins can manage roles and users
- `Search.tsx` and `Search2.tsx` are two different takes on global search

## Running it locally

You only need this once:

```
npm install
```

Then to start it:

```
npm run dev
```

It runs on `http://localhost:3000` by default and assumes the server is on `http://localhost:7000`. If yours is different, set `VITE_API_URL` in a `.env.local` file like this:

```
VITE_API_URL=http://localhost:7000/api
```

## Building for production

```
npm run build
```

The output goes into `dist/`. You can preview it locally with `npm run preview` if you want to make sure it looks the same as in dev.

## Tests

There's a small set of Vitest tests under `src/tests/`. Run them with:

```
npm test
```

Add `--watch` if you want them to re-run as you edit, or `--coverage` for a coverage report.

## How it talks to the server

Most of the API calls go through `src/services/api.ts`, which sets up an axios instance with the base URL and credentials so cookies get sent along. The socket connection lives in `src/context/SocketContext.tsx` and is reused everywhere that needs it.

Auth state is held in `src/context/AppContext.tsx`. When you sign in, the server sets a refresh cookie and returns an access token. The frontend keeps the access token in memory and refreshes it when needed.

## A heads up about the build

The `shared/` package is imported through a path alias (`@nebula/shared`). It is a source-only package: nothing gets compiled into `shared/dist/`. If you ever see compiled `.js` files appearing next to the `.ts` files in there, delete them. They confuse the bundler.
