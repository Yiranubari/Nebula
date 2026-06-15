# Nebula Server

This is the backend for Nebula. It serves the REST API, handles real-time messaging and call signaling over Socket.IO, and talks to Postgres through Prisma.

## What's in here

- Express 5 for the HTTP routes
- Prisma 6 for the database, with Postgres as the actual store
- Socket.IO for chat, presence, notifications, and WebRTC signaling
- JWT for authentication, with a separate refresh token kept in an httpOnly cookie
- bcryptjs for password hashing
- Helmet for security headers, plus rate limiting on auth routes
- Cloudinary and multer for file uploads
- Resend (or plain SMTP) for outbound email
- pino for logs, with pino-pretty when you're running locally
- Zod and envalid for validating incoming data and environment variables

## How the code is laid out

```
src/
├── modules/          One folder per feature, each with its own routes, controllers, and services
│   ├── auth/         Signup, login, OTP, refresh, password reset
│   ├── direct-messages/
│   ├── messages/     Channel and group messages
│   ├── notifications/
│   ├── tasks/        The task board
│   ├── tracks/       Audio tracks for huddles
│   ├── uploads/      Cloudinary file uploads
│   └── users/        User profiles and admin actions
├── middleware/       Auth, rate limiting, error handling
├── config/           Environment variable parsing and Prisma client
├── sockets/          Socket.IO event handlers
└── utils/            Small helpers (JWT, password hashing, mailer)
prisma/
├── schema.prisma     The database schema
├── migrations/       SQL migrations
└── seed.ts           Seed data for local development
```

## Running it locally

You'll need Node 20 or newer and a Postgres database you can connect to. Neon's free tier is fine.

1. Install the dependencies.

   ```
   npm install
   ```

2. Make a `.env` file in this folder. The required variables are:

   - `DATABASE_URL`: the pooled Postgres connection string (Neon calls this the "pooler" URL)
   - `DIRECT_URL`: the direct, non-pooled connection string, which Prisma uses for migrations
   - `JWT_SECRET`: a long random string, at least 32 characters
   - `JWT_REFRESH_SECRET`: a different long random string
   - `CLIENT_URL`: where the frontend runs, for example `http://localhost:3000`

   You can generate the JWT secrets with this one-liner:

   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   These are optional but recommended:

   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` for file uploads
   - `RESEND_API_KEY` and `EMAIL_FROM` for sending OTP emails in production
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` for sending emails over SMTP in development

3. Apply the database migrations.

   ```
   npx prisma migrate deploy
   ```

   If you want some sample users and data to play with, run the seed script:

   ```
   npx prisma db seed
   ```

4. Start the dev server.

   ```
   npm run dev
   ```

   It listens on port 4000 by default. The frontend expects it at `http://localhost:7000/api`, so if you're running both locally you might want to override `PORT` in your `.env` to match, or update `VITE_API_URL` on the frontend side.

## The auth flow, briefly

When you sign up, the server creates the user, hashes the password with bcrypt, and emails you a six-digit code. Until you verify that code, you can log in but you're stuck on the OTP page.

Once verified, login returns an access token in the response and a refresh token in an httpOnly cookie. The access token goes on every API request as a Bearer token. When it expires, the client hits `/auth/refresh`, the server reads the cookie, and you get a new access token without having to log in again.

## Building and running in production

```
npm run build
npm start
```

The build step runs Prisma's generate, compiles the TypeScript, and copies the assets folder over. The output ends up in `dist/server/src/`.

The server reads `NODE_ENV=production` and changes its behavior:

- Cookies become `Secure` with `SameSite=None` so they work across origins
- Logs switch from pretty-printed to JSON
- Express trusts the proxy in front of it, which matters on Render, Railway, and friends

## Tests

There are unit tests and integration tests, both run with Vitest.

```
npm test             # all unit tests
npm run test:watch   # re-run on save
npm run test:coverage
npm run test:integration   # the integration suite, which expects a test database
```

## A note on shared types

The `@nebula/shared` package lives one folder up at `../shared/`. The build step uses `tsc` to mirror those types into the compiled output. If you're poking around the imports and wondering why they don't resolve, check that you ran `npm install` in `shared/` too.
