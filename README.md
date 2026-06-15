# Nebula

Nebula is a small team workspace app. You can chat with people on your team, move tasks around on a board, hop into a video huddle, and keep an eye on notifications, all in one place.

This started as a personal project to figure out how a real-time app actually fits together end to end. The pieces are split across a React frontend, an Express backend, and a tiny shared package that keeps their TypeScript types in sync.

## What you can do in it

- Send direct messages and chat in group channels, with messages showing up in real time
- Drag tasks across a board (todo, in progress, done, that kind of thing)
- Jump into a voice or video call with screen sharing
- See a feed of notifications when something needs your attention
- Sign up with your email and verify it with a one-time code
- Manage users and roles from an admin panel

## How the repo is laid out

```
nebula/
├── frontend/   React app built with Vite
├── server/     Express API, Socket.IO, and Prisma
└── shared/     TypeScript types both sides import
```

The `shared/` package is the trick that keeps the API and the UI from drifting apart. When the shape of a message or a task changes, you change it once and both sides see it.

## Getting it running on your machine

You'll need:

- Node 20 or newer
- npm
- A Postgres database. Neon works well and has a free tier that's plenty for local dev.

The steps:

1. Clone the repo and install dependencies in each package.

   ```
   cd server     && npm install
   cd ../frontend && npm install
   cd ../shared   && npm install
   ```

2. In `server/`, make a `.env` file with at least:

   - `DATABASE_URL` and `DIRECT_URL` for your Postgres
   - `JWT_SECRET` and `JWT_REFRESH_SECRET` (any two long random strings, different from each other)
   - `CLIENT_URL=http://localhost:3000`

   These are optional but you'll probably want them:

   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` if you want file uploads to work
   - `RESEND_API_KEY` (or the `SMTP_*` variables) so the signup OTP emails actually leave the server

3. Apply the database schema.

   ```
   cd server
   npx prisma migrate deploy
   ```

4. Start both sides in separate terminals.

   ```
   # terminal 1, in server/
   npm run dev

   # terminal 2, in frontend/
   npm run dev
   ```

5. Open `http://localhost:3000`, sign up, check your email for the code, and you're in.

## The stack at a glance

On the frontend it's React 19 with Vite, Tailwind for styles, and React Router for the pages. Real-time stuff goes through Socket.IO. Video calls use simple-peer, which is a friendly wrapper around WebRTC.

On the backend it's Express 5 with Prisma talking to Postgres. Authentication is JWT based: a short-lived access token and a longer-lived refresh token, which lives in an httpOnly cookie so JavaScript can't read it. Helmet handles the security headers, and there's rate limiting on the auth routes. Email goes out through Resend in production, or plain SMTP if you're working locally.

## Where to go from here

There's a more detailed README in each package:

- [`frontend/`](frontend/README.md) for the React app
- [`server/`](server/README.md) for the API and sockets

## A note on the state of things

This is a side project, not a polished product. Some corners are rougher than others. If you find something that doesn't work, or you have an idea for making it better, open an issue or a pull request.
