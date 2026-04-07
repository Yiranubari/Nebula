# Nebula Backend — Finalized Implementation Plan

## Decisions Locked In

| Topic | Decision |
|---|---|
| Database | PostgreSQL + Prisma ORM |
| Real-time | Socket.IO |
| File uploads | Cloudinary |
| Repo structure | Monorepo — `frontend/` + `server/` + `shared/` inside existing Nebula root |
| Shared types | `shared/` package imported by both frontend and server |
| Huddles/WebRTC | Native WebRTC with Socket.IO as the **signaling server** (no media server needed) |

> [!NOTE]
> **WebRTC decision reasoning**: The existing `CallContext.tsx` already uses `navigator.mediaDevices.getUserMedia` and audio tracks — it's audio-only huddles with up to a small team. The simplest and most appropriate approach is to use **Socket.IO as a signaling channel** (exchanging SDP offers/answers and ICE candidates) and let browsers establish **direct peer-to-peer WebRTC connections**. No media server (mediasoup/LiveKit) is needed — those are for large video conferences (50+ people). We'll use the [`simple-peer`](https://github.com/feross/simple-peer) library on the frontend to wrap the WebRTC boilerplate.

---

## Monorepo Restructure

**Before** (current state — everything at root):
```
Nebula/
├── App.tsx, index.tsx, types.ts …
├── components/, context/, pages/, services/
├── package.json, vite.config.ts, tsconfig.json
└── .git, .gitignore, node_modules/
```

**After** (target state):
```
Nebula/                          ← repo root
├── frontend/                    ← moved React app
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── types.ts             ← can be removed once shared/ is wired
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── server/                      ← new Express backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── tasks/
│   │   │   ├── tracks/
│   │   │   ├── messages/
│   │   │   ├── direct-messages/
│   │   │   ├── notifications/
│   │   │   └── uploads/
│   │   ├── realtime/
│   │   │   ├── socket.ts
│   │   │   ├── events.ts
│   │   │   └── handlers/
│   │   │       ├── presence.handler.ts
│   │   │       ├── typing.handler.ts
│   │   │       ├── chat.handler.ts
│   │   │       ├── dm.handler.ts
│   │   │       ├── huddle.handler.ts    ← WebRTC signaling (offer/answer/ICE)
│   │   │       └── reaction.handler.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── role.middleware.ts
│   │   │   ├── validate.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── rateLimit.middleware.ts
│   │   ├── db/
│   │   │   └── prisma.ts
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts
│   │   │   ├── pagination.ts
│   │   │   └── asyncHandler.ts
│   │   ├── types/
│   │   │   └── express.d.ts
│   │   ├── app.ts
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── .env.example
│   ├── nodemon.json
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                      ← shared TypeScript types
│   ├── types/
│   │   ├── index.ts             ← re-exports all
│   │   ├── user.types.ts
│   │   ├── task.types.ts
│   │   ├── message.types.ts
│   │   ├── track.types.ts
│   │   ├── notification.types.ts
│   │   ├── dm.types.ts
│   │   ├── presence.types.ts
│   │   └── socket.events.ts     ← typed Socket.IO event names + payloads
│   ├── tsconfig.json
│   └── package.json             ← name: "@nebula/shared"
│
└── .gitignore
```

---

## Tech Stack (Server)

| Layer | Package |
|---|---|
| Runtime | Node.js 20 LTS |
| Language | TypeScript 5 (strict) |
| Framework | Express 5 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Real-time | Socket.IO 4 |
| Auth | `jsonwebtoken` + `bcryptjs` |
| Validation | Zod |
| File uploads | `multer` (memory) → Cloudinary SDK |
| Env config | `dotenv` + `envalid` |
| Logging | Pino |
| Rate limiting | `express-rate-limit` |
| Security | `helmet`, `cors` |
| Dev server | `tsx --watch` (nodemon replacement) |
| Testing | Vitest + Supertest |
| Linting | ESLint + Prettier |

---

## Prisma Schema (overview)

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  passwordHash  String
  role          Role      @default(MEMBER)
  avatar        String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  assignedTasks   Task[]          @relation("AssignedTasks")
  sentDMs         DirectMessage[] @relation("SentDMs")
  receivedDMs     DirectMessage[] @relation("ReceivedDMs")
  messages        Message[]
  tracks          TrackMember[]
  refreshTokens   RefreshToken[]
  notifications   Notification[]  @relation("RecipientNotifications")
  sentNotifs      Notification[]  @relation("RequesterNotifications")
}

enum Role { ADMIN MEMBER }

model Task {
  id              String      @id @default(cuid())
  title           String
  description     String      @default("")
  status          TaskStatus  @default(TODO)
  priority        Priority    @default(MEDIUM)
  assigneeId      String?
  assignee        User?       @relation("AssignedTasks", fields: [assigneeId], references: [id])
  estimatedHours  Float       @default(0)
  dueDate         DateTime?
  labels          String[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

enum TaskStatus { TODO IN_PROGRESS REVIEW DONE }
enum Priority  { LOW MEDIUM HIGH CRITICAL }

model Track {
  id        String        @id @default(cuid())
  name      String
  createdAt DateTime      @default(now())
  members   TrackMember[]
  messages  Message[]
}

model TrackMember {
  trackId String
  userId  String
  track   Track  @relation(fields: [trackId], references: [id], onDelete: Cascade)
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([trackId, userId])
}

model Message {
  id          String   @id @default(cuid())
  content     String
  userId      String
  trackId     String
  parentId    String?          // threaded replies (self-ref)
  pinned      Boolean  @default(false)
  attachments Json?            // Attachment[]
  reactions   Json?            // Record<emoji, userId[]>
  readBy      String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id])
  track       Track    @relation(fields: [trackId], references: [id], onDelete: Cascade)
  parent      Message? @relation("ThreadReplies", fields: [parentId], references: [id])
  replies     Message[] @relation("ThreadReplies")
}

model DirectMessage {
  id          String   @id @default(cuid())
  content     String
  fromUserId  String
  toUserId    String
  attachments Json?
  reactions   Json?
  readBy      String[]
  status      DMStatus @default(SENT)
  createdAt   DateTime @default(now())
  from        User     @relation("SentDMs",     fields: [fromUserId], references: [id])
  to          User     @relation("ReceivedDMs", fields: [toUserId],   references: [id])
}

enum DMStatus { SENT FAILED }

model Notification {
  id          String             @id @default(cuid())
  type        NotificationType?
  taskId      String?
  messageId   String?
  trackId     String?
  emoji       String?
  requesterId String
  recipientId String?
  status      NotifStatus        @default(PENDING)
  read        Boolean            @default(false)
  createdAt   DateTime           @default(now())
  requester   User @relation("RequesterNotifications", fields: [requesterId], references: [id])
  recipient   User? @relation("RecipientNotifications", fields: [recipientId], references: [id])
}

enum NotificationType { APPROVAL_REQUEST ASSIGNED MENTION REACTION }
enum NotifStatus      { PENDING APPROVED REJECTED INFO }

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## REST API Surface

### Auth — `/api/auth`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Sign up |
| POST | `/login` | ❌ | Login → access + refresh tokens |
| POST | `/refresh` | ❌ | Rotate refresh token (cookie) |
| POST | `/logout` | ✅ | Invalidate refresh token |
| GET  | `/me` | ✅ | Current user |

### Users — `/api/users`
| Method | Route | Role | Description |
|---|---|---|---|
| GET | `/` | ADMIN | List all users |
| GET | `/:id` | any | Get user profile |
| PATCH | `/:id` | own | Update name/avatar |
| DELETE | `/:id` | ADMIN | Delete user |

### Tasks — `/api/tasks`
| Method | Route | Description |
|---|---|---|
| GET | `/` | List (filter: status, priority, assigneeId) |
| POST | `/` | Create |
| GET | `/:id` | Get |
| PATCH | `/:id` | Update |
| DELETE | `/:id` | Delete |

### Tracks — `/api/tracks`
| Method | Route | Description |
|---|---|---|
| GET | `/` | My tracks |
| POST | `/` | Create |
| GET | `/:id` | Get |
| PATCH | `/:id` | Update name/members |
| DELETE | `/:id` | Delete |
| GET | `/:id/messages` | Paginated messages |

### Direct Messages — `/api/dm`
| Method | Route | Description |
|---|---|---|
| GET | `/:userId` | Paginated DM history |
| DELETE | `/:messageId` | Delete a DM |

### Notifications — `/api/notifications`
| Method | Route | Description |
|---|---|---|
| GET | `/` | My notifications |
| PATCH | `/:id` | Update status / mark read |
| DELETE | `/:id` | Delete |

### Uploads — `/api/uploads`
| Method | Route | Description |
|---|---|---|
| POST | `/` | Upload file → Cloudinary URL |

---

## Socket.IO Events

### Presence
| Direction | Event | Payload |
|---|---|---|
| C→S | `presence:set` | `{ status: PresenceStatus }` |
| S→C | `presence:update` | `{ userId, status, lastActive, inHuddleTrackId? }` |

### Typing
| Direction | Event | Payload |
|---|---|---|
| C→S | `typing:start` | `{ trackId? } \| { dmKey? }` |
| C→S | `typing:stop` | same |
| S→C | `typing:update` | `{ trackId?, dmKey?, userIds[] }` |

### Chat Messages
| Direction | Event | Payload |
|---|---|---|
| C→S | `message:send` | `{ trackId, content, parentId?, attachments? }` |
| C→S | `message:react` | `{ messageId, emoji }` |
| C→S | `message:read` | `{ messageId }` |
| C→S | `message:pin` | `{ messageId, pinned }` |
| S→C | `message:new` | Full message object |
| S→C | `message:updated` | Updated message |

### Direct Messages
| Direction | Event | Payload |
|---|---|---|
| C→S | `dm:send` | `{ toUserId, content, attachments? }` |
| C→S | `dm:react` | `{ messageId, emoji }` |
| S→C | `dm:new` | Full DM object |
| S→C | `dm:updated` | Updated DM |

### Notifications
| Direction | Event | Payload |
|---|---|---|
| S→C | `notification:new` | Notification object |

### Huddle / WebRTC Signaling
| Direction | Event | Payload |
|---|---|---|
| C→S | `huddle:join` | `{ roomId }` |
| C→S | `huddle:leave` | `{ roomId }` |
| C→S | `huddle:offer` | `{ roomId, toUserId, sdp }` |
| C→S | `huddle:answer` | `{ roomId, toUserId, sdp }` |
| C→S | `huddle:ice` | `{ roomId, toUserId, candidate }` |
| C→S | `huddle:mute` | `{ roomId, muted }` |
| C→S | `huddle:hand` | `{ roomId, raised }` |
| S→C | `huddle:user-joined` | `{ roomId, userId, participants[] }` |
| S→C | `huddle:user-left` | `{ roomId, userId, participants[] }` |
| S→C | `huddle:offer` | `{ fromUserId, sdp }` (relay) |
| S→C | `huddle:answer` | `{ fromUserId, sdp }` (relay) |
| S→C | `huddle:ice` | `{ fromUserId, candidate }` (relay) |
| S→C | `huddle:state` | `{ roomId, participants[] }` |

> **How WebRTC signaling works here**: The server acts as a "relay" — it never handles media. When user A joins a huddle room, the server tells all existing participants. Each existing participant sends an SDP `offer` via Socket.IO to the new joiner, who replies with an `answer`. ICE candidates are relayed the same way. The browsers then establish a direct audio P2P connection.

---

## Middleware Pipeline

```
Request
  → cors (allow frontend origin)
  → helmet (security headers)
  → express-rate-limit (global)
  → express.json()
  → /api/auth routes (no auth required)
  → auth.middleware (verify JWT → req.user)
  → role.middleware (optional, per route)
  → validate.middleware (Zod schema)
  → Controller → Service → Prisma
  → Response
  → error.middleware (global 4-param handler)
```

---

## Execution Order

1. **Restructure repo** — move frontend files into `frontend/`, create `shared/` and `server/` skeletons
2. **`shared/` package** — extract + type all shared types, Socket.IO event types, `package.json` as `@nebula/shared`
3. **`server/` scaffold** — `package.json`, `tsconfig.json`, `.env.example`, `nodemon.json`
4. **Prisma setup** — `schema.prisma`, run initial migration
5. **Core infrastructure** — `db/prisma.ts`, `config/env.ts`, `utils/`, `middleware/`, `app.ts`, `index.ts`
6. **Auth module** — register, login, refresh, logout, me
7. **Users module**
8. **Tasks module**
9. **Tracks + Messages modules**
10. **Direct Messages module**
11. **Notifications module**
12. **Uploads module** (Cloudinary)
13. **Socket.IO layer** — presence, typing, chat, DM, huddle signaling
14. **Wire `simple-peer`** in frontend `CallContext` to use Socket.IO signaling
15. **Update frontend `services/`** to call the new REST API
16. **Tests** — unit + integration stubs

---

## Verification Plan

### Automated
- `cd server && npm test` — Vitest unit tests for services (mocked Prisma)
- `cd server && npm run test:integration` — Supertest route tests

### Manual
- Thunder Client / Postman → auth flow → tasks CRUD → file upload
- Browser → Socket.IO Admin UI → verify presence events
- Two browser tabs → join same huddle → verify WebRTC audio connection forms
