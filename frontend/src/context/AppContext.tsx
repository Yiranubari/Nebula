import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import {
  Task,
  User,
  Message,
  TaskStatus,
  Priority,
  Track,
  Notification,
  NotificationStatus,
} from "../types";
import {
  PresenceMap,
  PresenceStatus,
  TypingByDm,
  TypingByTrack,
} from "../types";
import type { DirectMessage } from "../types";

interface AppContextType {
  currentUser: User;
  users: User[];
  tasks: Task[];
  messages: Message[];
  tracks: Track[];
  notifications: Notification[];
  directMessages: DirectMessage[];
  presence: PresenceMap;
  typingByTrack: TypingByTrack;
  typingByDm: TypingByDm;
  isAuthenticated: boolean;
  switchUser: (userId: string) => void;
  addUser: (user: User) => void;
  updateCurrentUser: (
    updates: Partial<Pick<User, "name" | "email" | "avatar">>
  ) => void;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (name: string, email: string, password?: string, avatar?: string) => Promise<boolean>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  removeUser: (userId: string) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  sendMessage: (
    content: string,
    trackId?: string,
    attachments?: import("../types").Attachment[]
  ) => void;
  sendReply: (
    parentId: string,
    content: string,
    trackId?: string,
    attachments?: import("../types").Attachment[]
  ) => void;
  pinMessage: (messageId: string, pinned: boolean) => void;
  deleteMessage: (messageId: string) => void;
  toggleReaction: (messageId: string, emoji: string, userId: string) => void;
  toggleDirectMessageReaction: (
    directMessageId: string,
    emoji: string,
    userId: string
  ) => void;
  requestTaskApproval: (taskId: string) => void;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsReadForUser: (userId: string) => void;
  addTrack: (name: string) => Track | null;
  addMemberToTrack: (trackId: string, userId: string) => void;
  removeMemberFromTrack: (trackId: string, userId: string) => void;
  renameTrack: (trackId: string, name: string) => void;
  deleteTrack: (trackId: string) => void;
  deleteTask: (taskId: string) => void;
  setUserPresence: (
    userId: string,
    status: PresenceStatus,
    extra?: Partial<{ inHuddleTrackId: string | null }>
  ) => void;
  setTyping: (trackId: string, userId: string, isTyping: boolean) => void;
  setDmTyping: (withUserId: string, userId: string, isTyping: boolean) => void;
  markTrackRead: (trackId: string) => void;
  sendDirectMessage: (
    toUserId: string,
    content: string,
    attachments?: import("../types").Attachment[]
  ) => string;
  markDmThreadRead: (withUserId: string) => void;
  setDirectMessageStatus: (id: string, status: "sent" | "failed") => void;
  addTaskReminder: (taskId: string, forUserId?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const MOCK_USERS: User[] = [
  {
    id: "u1",
    name: "Alice Chen",
    role: "ADMIN",
    email: "alice@nebula.dev",
    avatar: "https://picsum.photos/100/100?random=1",
  },
  {
    id: "u2",
    name: "Bob Smith",
    role: "MEMBER",
    email: "bob@nebula.dev",
    avatar: "https://picsum.photos/100/100?random=2",
  },
  {
    id: "u3",
    name: "Charlie Kim",
    role: "MEMBER",
    email: "charlie@nebula.dev",
    avatar: "https://picsum.photos/100/100?random=3",
  },
  {
    id: "u4",
    name: "Diana Prince",
    role: "MEMBER",
    email: "diana@nebula.dev",
    avatar: "https://picsum.photos/100/100?random=4",
  },
];

const INITIAL_TASKS: Task[] = [
  {
    id: "t1",
    title: "Setup Project Repo",
    description: "Initialize Git, configure CI/CD pipelines.",
    status: TaskStatus.DONE,
    priority: Priority.HIGH,
    assigneeId: "u2",
    createdAt: new Date().toISOString(),
    estimatedHours: 4,
  },
  {
    id: "t2",
    title: "Design Login Page",
    description: "Create Figma mockups for the authentication flow.",
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.MEDIUM,
    assigneeId: "u3",
    createdAt: new Date().toISOString(),
    estimatedHours: 6,
  },
  {
    id: "t3",
    title: "API Schema Definition",
    description: "Define the REST endpoints for the task resource.",
    status: TaskStatus.TODO,
    priority: Priority.CRITICAL,
    assigneeId: "u1",
    createdAt: new Date().toISOString(),
    estimatedHours: 3,
  },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "m1",
    userId: "u2",
    content: "Hey team, repo is set up!",
    timestamp: new Date(Date.now() - 100000).toISOString(),
  },
  {
    id: "m2",
    userId: "u1",
    content: "Great job Bob. Charlie, how is the design coming?",
    timestamp: new Date(Date.now() - 50000).toISOString(),
  },
];

// INITIAL_TRACKS is filled after users are hydrated to include all members
const INITIAL_TRACKS_BASE: Omit<Track, "members">[] = [
  {
    id: "track-general",
    name: "general-team",
    createdAt: new Date().toISOString(),
  },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const USER_STORAGE_KEY = "nebula.user.v1";
  const USERS_STORAGE_KEY = "nebula.users.v1";
  const AUTH_STORAGE_KEY = "nebula.auth.v1";
  const TRACKS_STORAGE_KEY = "nebula.tracks.v1";
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const id =
        typeof window !== "undefined"
          ? window.localStorage.getItem(USER_STORAGE_KEY)
          : null;
      // Hydrate users first to locate the current user by id
      const rawUsers =
        typeof window !== "undefined"
          ? window.localStorage.getItem(USERS_STORAGE_KEY)
          : null;
      const hydratedUsers = rawUsers
        ? (JSON.parse(rawUsers) as User[])
        : MOCK_USERS;
      const found = id ? hydratedUsers.find((u) => u.id === id) : undefined;
      return found || hydratedUsers[0];
    } catch {
      return MOCK_USERS[0];
    }
  });
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(USERS_STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as User[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return MOCK_USERS;
  });
  const TASKS_STORAGE_KEY = "nebula.tasks.v1";
  const MESSAGES_STORAGE_KEY = "nebula.messages.v1";
  const DMS_STORAGE_KEY = "nebula.dms.v1";
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(TASKS_STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Task[];
        if (Array.isArray(parsed)) {
          return parsed.map((t) => ({
            ...t,
            // Defensive coercions to avoid runtime issues
            estimatedHours: Number((t as any).estimatedHours ?? 0),
            createdAt: t.createdAt || new Date().toISOString(),
          }));
        }
      }
    } catch {}
    return INITIAL_TASKS;
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(MESSAGES_STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_MESSAGES;
  });
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(DMS_STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as DirectMessage[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const NOTIFS_STORAGE_KEY = "nebula.notifications.v1";
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(NOTIFS_STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Notification[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [tracks, setTracks] = useState<Track[]>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(TRACKS_STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as any[];
        if (Array.isArray(parsed) && parsed.length) {
          const allMemberIds = (Array.isArray(users) ? users : []).map(
            (u) => u.id
          );
          return parsed.map((t) => ({
            id: t.id,
            name: t.name,
            createdAt: t.createdAt || new Date().toISOString(),
            members: Array.isArray(t.members) ? t.members : allMemberIds,
          }));
        }
      }
    } catch {}
    // Default: general includes all users
    const allMemberIds = (Array.isArray(users) ? users : []).map((u) => u.id);
    return INITIAL_TRACKS_BASE.map((t) => ({ ...t, members: allMemberIds }));
  });

  // Presence and typing state
  const PRESENCE_STORAGE_KEY = "nebula.presence.v1";
  const TYPING_STORAGE_KEY = "nebula.typing.v1";

  const [presence, setPresence] = useState<PresenceMap>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(PRESENCE_STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as PresenceMap;
        return parsed || {};
      }
    } catch {}
    // Default: mark known users offline, current user online
    const now = new Date().toISOString();
    const map: PresenceMap = {};
    (Array.isArray(MOCK_USERS) ? MOCK_USERS : []).forEach((u) => {
      map[u.id] = {
        status:
          u.id === (currentUser?.id || MOCK_USERS[0].id) ? "online" : "offline",
        lastActive: now,
        inHuddleTrackId: null,
      };
    });
    return map;
  });

  const [typingByTrack, setTypingByTrack] = useState<TypingByTrack>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(TYPING_STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as TypingByTrack;
        return parsed || {};
      }
    } catch {}
    return {};
  });

  const [typingByDm, setTypingByDm] = useState<TypingByDm>({});

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(AUTH_STORAGE_KEY)
          : null;
      if (raw === "true" || raw === "false") return raw === "true";
    } catch {}
    return true;
  });

  const switchUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      try {
        window.localStorage.setItem(USER_STORAGE_KEY, user.id);
      } catch {}
    }
  };

  const addUser = (user: User) => {
    setUsers((prev) => {
      // Prevent duplicate IDs
      if (prev.some((u) => u.id === user.id)) return prev;
      const next = [...prev, user];
      // If no currentUser, set first added as current
      if (!currentUser || !next.find((u) => u.id === currentUser.id)) {
        setCurrentUser(user);
        try {
          window.localStorage.setItem(USER_STORAGE_KEY, user.id);
        } catch {}
      }
      return next;
    });
  };

  const updateCurrentUser = (
    updates: Partial<Pick<User, "name" | "email" | "avatar">>
  ) => {
    setUsers((prev) => {
      const next = prev.map((u) =>
        u.id === currentUser.id ? { ...u, ...updates } : u
      );
      const updated = next.find((u) => u.id === currentUser.id) || currentUser;
      setCurrentUser(updated);
      return next;
    });
  };

  const removeUser = (userId: string) => {
    setUsers((prev) => {
      if (prev.length <= 1) {
        // Prevent removing the last remaining user
        return prev;
      }
      const next = prev.filter((u) => u.id !== userId);
      // Nullify assignee on tasks for removed user
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.assigneeId === userId ? { ...t, assigneeId: null } : t
        )
      );
      // Remove the user from all track member lists
      setTracks((prevTracks) =>
        prevTracks.map((t) => ({
          ...t,
          members: t.members.filter((id) => id !== userId),
        }))
      );
      // If current user removed, switch to first remaining
      if (currentUser.id === userId) {
        const fallback = next[0];
        setCurrentUser(fallback);
        try {
          window.localStorage.setItem(USER_STORAGE_KEY, fallback.id);
        } catch {}
      }
      return next;
    });
  };

  const addTask = (task: Task) => {
    setTasks((prev) => [...prev, task]);
    if (currentUser.role === "ADMIN" && task.assigneeId) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `n-${Date.now()}`,
          taskId: task.id,
          requesterId: currentUser.id,
          recipientId: task.assigneeId,
          createdAt: new Date().toISOString(),
          status: "INFO",
          type: "ASSIGNED",
          read: false,
        },
      ]);
    }
  };

  const updateTask = (task: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...task } : t)));
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks((prev) => {
      const isAdmin = currentUser.role === "ADMIN";
      return prev.map((t) => {
        if (t.id !== taskId) return t;
        // Only admin or the task assignee can progress task status
        if (!isAdmin && currentUser.id !== t.assigneeId) {
          return t;
        }
        if (status === TaskStatus.DONE && !isAdmin) {
          // Gate: non-admin cannot set DONE; switch to REVIEW and notify admins
          const next = { ...t, status: TaskStatus.REVIEW };
          setNotifications((prevN) => [
            ...prevN,
            {
              id: `n-${Date.now()}`,
              taskId: t.id,
              requesterId: currentUser.id,
              createdAt: new Date().toISOString(),
              status: "PENDING" as NotificationStatus,
              read: false,
            },
          ]);
          return next;
        }
        return { ...t, status };
      });
    });
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    // Clean up related notifications
    setNotifications((prev) => prev.filter((n) => n.taskId !== taskId));
  };

  const setUserPresence = (
    userId: string,
    status: PresenceStatus,
    extra?: Partial<{ inHuddleTrackId: string | null }>
  ) => {
    setPresence((prev) => {
      const now = new Date().toISOString();
      const next: PresenceMap = {
        ...prev,
        [userId]: {
          status,
          lastActive: now,
          inHuddleTrackId:
            extra && "inHuddleTrackId" in extra
              ? extra.inHuddleTrackId ?? null
              : prev[userId]?.inHuddleTrackId ?? null,
        },
      };
      try {
        window.localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const setTyping = (trackId: string, userId: string, isTyping: boolean) => {
    setTypingByTrack((prev) => {
      const current = new Set(prev[trackId] || []);
      if (isTyping) current.add(userId);
      else current.delete(userId);
      const next: TypingByTrack = {
        ...prev,
        [trackId]: Array.from(current),
      };
      try {
        window.localStorage.setItem(TYPING_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const dmThreadKey = (a: string, b: string) => [a, b].sort().join("|");

  const setDmTyping = (
    withUserId: string,
    userId: string,
    isTyping: boolean
  ) => {
    const key = dmThreadKey(currentUser.id, withUserId);
    setTypingByDm((prev) => {
      const current = new Set(prev[key] || []);
      if (isTyping) current.add(userId);
      else current.delete(userId);
      const nextArr = Array.from(current);
      if (nextArr.length === 0) {
        if (!(key in prev)) return prev;
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: nextArr };
    });
  };

  const markTrackRead = (trackId: string) => {
    const me = currentUser.id;
    setMessages((prev) => {
      let changed = false;
      const next = prev.map((m) => {
        const tid = m.trackId || tracks[0]?.id || "track-general";
        if (tid !== trackId) return m;
        const readBy = new Set(m.readBy || []);
        if (readBy.has(me)) return m;
        readBy.add(me);
        changed = true;
        return { ...m, readBy: Array.from(readBy) };
      });
      return changed ? next : prev;
    });
  };

  const sendDirectMessage = (
    toUserId: string,
    content: string,
    attachments: import("../types").Attachment[] = []
  ): string => {
    const dm: DirectMessage = {
      id: `dm-${Date.now()}`,
      fromUserId: currentUser.id,
      toUserId,
      content,
      timestamp: new Date().toISOString(),
      attachments: attachments && attachments.length ? attachments : undefined,
      reactions: {},
      readBy: [currentUser.id],
      status: "sent",
    };
    setDirectMessages((prev) => [...prev, dm]);
    return dm.id;
  };

  const toggleDirectMessageReaction = (
    directMessageId: string,
    emoji: string,
    userId: string
  ) => {
    setDirectMessages((prev) =>
      prev.map((m) => {
        if (m.id !== directMessageId) return m;
        const map = { ...(m.reactions || {}) } as Record<string, string[]>;
        const before = new Set(map[emoji] || []);
        const after = new Set(before);
        if (after.has(userId)) after.delete(userId);
        else after.add(userId);
        map[emoji] = Array.from(after);
        return { ...m, reactions: map };
      })
    );
  };

  const markDmThreadRead = (withUserId: string) => {
    const me = currentUser.id;
    setDirectMessages((prev) =>
      prev.map((m) => {
        const isBetween =
          (m.fromUserId === me && m.toUserId === withUserId) ||
          (m.fromUserId === withUserId && m.toUserId === me);
        if (!isBetween) return m;
        const readBy = new Set(m.readBy || []);
        readBy.add(me);
        return { ...m, readBy: Array.from(readBy) };
      })
    );
  };

  const setDirectMessageStatus = (id: string, status: "sent" | "failed") => {
    setDirectMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m))
    );
  };

  const addTaskReminder = (taskId: string, forUserId?: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const recipient = forUserId || task.assigneeId || currentUser.id;
    setNotifications((prev) => [
      ...prev,
      {
        id: `n-${Date.now()}-rem-${taskId}`,
        taskId,
        requesterId: currentUser.id,
        recipientId: recipient || undefined,
        createdAt: new Date().toISOString(),
        status: "INFO",
        type: "ASSIGNED",
        read: false,
      },
    ]);
  };

  const sendMessage = (
    content: string,
    trackId?: string,
    attachments: import("../types").Attachment[] = []
  ) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      userId: currentUser.id,
      content,
      timestamp: new Date().toISOString(),
      trackId: trackId || tracks[0]?.id || "track-general",
      pinned: false,
      attachments: attachments && attachments.length ? attachments : undefined,
      reactions: {},
      readBy: [currentUser.id],
    };
    setMessages((prev) => [...prev, newMessage]);
    // Mentions detection: @user or @track (by first-name/fullname and track name)
    try {
      const text = content || "";
      const rawHandles = text.match(/@[A-Za-z0-9_\-]+/g) || [];
      if (rawHandles.length) {
        const handleSet = new Set(
          rawHandles.map((h) => h.slice(1).toLowerCase())
        );
        const byUserId = new Set<string>();
        const byTrackId = new Set<string>();

        // Build user handle candidates (first name, full name nospace)
        users.forEach((u) => {
          const first = (u.name.split(/\s+/)[0] || "").toLowerCase();
          const nospace = u.name.toLowerCase().replace(/\s+/g, "");
          if (handleSet.has(first) || handleSet.has(nospace)) {
            if (u.id !== currentUser.id) byUserId.add(u.id);
          }
        });
        // Build track handles (track name)
        tracks.forEach((t) => {
          const tname = t.name.toLowerCase();
          if (handleSet.has(tname)) byTrackId.add(t.id);
        });

        const notifs: Notification[] = [];
        // User mentions
        byUserId.forEach((uid) => {
          notifs.push({
            id: `n-${Date.now()}-${uid}`,
            requesterId: currentUser.id,
            recipientId: uid,
            createdAt: new Date().toISOString(),
            status: "INFO",
            type: "MENTION",
            messageId: newMessage.id,
            trackId: newMessage.trackId,
            read: false,
          });
        });
        // Track mentions: notify all members (except sender)
        byTrackId.forEach((tid) => {
          const t = tracks.find((x) => x.id === tid);
          (t?.members || []).forEach((uid) => {
            if (uid === currentUser.id) return;
            notifs.push({
              id: `n-${Date.now()}-${tid}-${uid}`,
              requesterId: currentUser.id,
              recipientId: uid,
              createdAt: new Date().toISOString(),
              status: "INFO",
              type: "MENTION",
              messageId: newMessage.id,
              trackId: newMessage.trackId,
              read: false,
            });
          });
        });
        if (notifs.length) setNotifications((prev) => [...prev, ...notifs]);
      }
    } catch {}
  };

  const sendReply = (
    parentId: string,
    content: string,
    trackId?: string,
    attachments: import("../types").Attachment[] = []
  ) => {
    const parent = messages.find((m) => m.id === parentId);
    const tid = trackId || parent?.trackId || tracks[0]?.id || "track-general";
    const reply: Message = {
      id: `${Date.now()}-r`,
      userId: currentUser.id,
      content,
      timestamp: new Date().toISOString(),
      trackId: tid,
      parentId,
      pinned: false,
      attachments: attachments && attachments.length ? attachments : undefined,
      reactions: {},
      readBy: [currentUser.id],
    };
    setMessages((prev) => [...prev, reply]);
  };

  const pinMessage = (messageId: string, pinned: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, pinned } : m))
    );
  };

  const deleteMessage = (messageId: string) => {
    setMessages((prev) =>
      prev.filter((m) => m.id !== messageId && m.parentId !== messageId)
    );
  };

  const toggleReaction = (messageId: string, emoji: string, userId: string) => {
    const now = Date.now();
    const notifId = `n-${now}-react-${messageId}-${emoji}-${userId}`;
    const createdAt = new Date(now).toISOString();
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const map = { ...(m.reactions || {}) } as Record<string, string[]>;
        const before = new Set(map[emoji] || []);
        const after = new Set(before);
        let added = false;
        if (after.has(userId)) {
          after.delete(userId);
        } else {
          after.add(userId);
          added = true;
        }
        map[emoji] = Array.from(after);

        // If a new reaction was added and the message author isn't the reactor, notify them
        try {
          if (added && m.userId !== userId) {
            setNotifications((prevN) => {
              if (prevN.some((n) => n.id === notifId)) return prevN;
              return [
                ...prevN,
                {
                  id: notifId,
                  messageId: m.id,
                  trackId: m.trackId,
                  emoji: emoji,
                  requesterId: userId,
                  recipientId: m.userId,
                  createdAt,
                  status: "INFO",
                  type: "REACTION",
                  read: false,
                },
              ];
            });
          }
        } catch {}

        return { ...m, reactions: map };
      })
    );
  };

  const requestTaskApproval = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const isAdmin = currentUser.role === "ADMIN";
    // Only admin or assignee can request approval
    if (!isAdmin && currentUser.id !== task.assigneeId) return;
    setNotifications((prev) => [
      ...prev,
      {
        id: `n-${Date.now()}`,
        taskId,
        requesterId: currentUser.id,
        recipientId: users.find((u) => u.role === "ADMIN")?.id,
        createdAt: new Date().toISOString(),
        status: "PENDING",
        type: "APPROVAL_REQUEST",
        read: false,
      },
    ]);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: TaskStatus.REVIEW } : t
      )
    );
  };

  const approveTask = (taskId: string) => {
    if (currentUser.role !== "ADMIN") return;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: TaskStatus.DONE } : t))
    );
    setNotifications((prev) =>
      prev.map((n) =>
        n.taskId === taskId ? { ...n, status: "APPROVED", read: false } : n
      )
    );
  };

  const rejectTask = (taskId: string) => {
    if (currentUser.role !== "ADMIN") return;
    // Keep task in REVIEW; mark notification rejected
    setNotifications((prev) =>
      prev.map((n) =>
        n.taskId === taskId ? { ...n, status: "REJECTED", read: false } : n
      )
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsReadForUser = (userId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        // Mark as read if relevant to user
        n.recipientId === userId || n.requesterId === userId
          ? { ...n, read: true }
          : n
      )
    );
  };

  const addTrack = (name: string) => {
    const normalized = name.trim();
    if (!normalized) return null;
    // Prevent duplicates (case-insensitive)
    const exists = tracks.some(
      (t) => t.name.toLowerCase() === normalized.toLowerCase()
    );
    if (exists) return null;
    const track: Track = {
      id: `track-${Date.now()}`,
      name: normalized,
      createdAt: new Date().toISOString(),
      members: users.map((u) => u.id),
    };
    setTracks((prev) => [...prev, track]);
    return track;
  };

  const addMemberToTrack = (trackId: string, userId: string) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId && !t.members.includes(userId)
          ? { ...t, members: [...t.members, userId] }
          : t
      )
    );
  };

  const removeMemberFromTrack = (trackId: string, userId: string) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? { ...t, members: t.members.filter((id) => id !== userId) }
          : t
      )
    );
  };

  const renameTrack = (trackId: string, name: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, name: normalized } : t))
    );
  };

  const deleteTrack = (trackId: string) => {
    // Prevent deletion of general
    if (trackId === "track-general") return;
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const login = async (email: string, password?: string) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      setIsAuthenticated(true);
      if (res.data.user) {
        setCurrentUser(res.data.user);
        window.localStorage.setItem(USER_STORAGE_KEY, res.data.user.id);
      }
      window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
      toast.success("Successfully logged in");
      return true;
    } catch (err: any) {
      if (err.response?.status !== 403) {
        // error messages are handled by api interceptor
      }
      return false;
    }
  };

  const signup = async (name: string, email: string, password?: string, avatar?: string) => {
    try {
      const res = await api.post("/auth/register", { name, email, password, avatar });
      toast.success(res.data.message || "Signup successful. Please verify your email.");
      return true;
    } catch (err: any) {
      return false;
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const res = await api.post("/auth/verify-otp", { email, otp });
      setIsAuthenticated(true);
      if (res.data.user) {
        setCurrentUser(res.data.user);
        window.localStorage.setItem(USER_STORAGE_KEY, res.data.user.id);
      }
      window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
      toast.success("Email verified successfully!");
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {}
    setIsAuthenticated(false);
    window.localStorage.setItem(AUTH_STORAGE_KEY, "false");
    window.location.hash = "#/login";
  };

  // Persist tasks to localStorage whenever they change
  useEffect(() => {
    try {
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  // Persist messages
  useEffect(() => {
    try {
      window.localStorage.setItem(
        MESSAGES_STORAGE_KEY,
        JSON.stringify(messages)
      );
    } catch {}
  }, [messages]);

  // Persist tracks
  useEffect(() => {
    try {
      window.localStorage.setItem(TRACKS_STORAGE_KEY, JSON.stringify(tracks));
    } catch {}
  }, [tracks]);

  // Persist direct messages
  useEffect(() => {
    try {
      window.localStorage.setItem(
        DMS_STORAGE_KEY,
        JSON.stringify(directMessages)
      );
    } catch {}
  }, [directMessages]);

  // Persist notifications
  useEffect(() => {
    try {
      window.localStorage.setItem(
        NOTIFS_STORAGE_KEY,
        JSON.stringify(notifications)
      );
    } catch {}
  }, [notifications]);

  // Persist users
  useEffect(() => {
    try {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch {}
  }, [users]);

  // Persist presence & typing
  useEffect(() => {
    try {
      window.localStorage.setItem(
        PRESENCE_STORAGE_KEY,
        JSON.stringify(presence)
      );
    } catch {}
  }, [presence]);
  useEffect(() => {
    try {
      window.localStorage.setItem(
        TYPING_STORAGE_KEY,
        JSON.stringify(typingByTrack)
      );
    } catch {}
  }, [typingByTrack]);

  // Initialize current user's presence and listen for cross-tab updates
  useEffect(() => {
    // Mark current user online on mount
    setUserPresence(currentUser.id, "online");

    const onBeforeUnload = () => {
      try {
        const now = new Date().toISOString();
        const next = { ...presence };
        next[currentUser.id] = {
          status: "offline",
          lastActive: now,
          inHuddleTrackId: next[currentUser.id]?.inHuddleTrackId ?? null,
        };
        window.localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(next));
      } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    const onVisibility = () => {
      if (document.hidden) setUserPresence(currentUser.id, "idle");
      else setUserPresence(currentUser.id, "online");
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onMouse = () => setUserPresence(currentUser.id, "online");
    const onKey = () => setUserPresence(currentUser.id, "online");
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("keydown", onKey);

    const onStorage = (e: StorageEvent) => {
      if (e.key === PRESENCE_STORAGE_KEY) {
        try {
          const parsed = JSON.parse(e.newValue || "{}") as PresenceMap;
          setPresence(parsed || {});
        } catch {}
      }
      if (e.key === TYPING_STORAGE_KEY) {
        try {
          const parsed = JSON.parse(e.newValue || "{}") as TypingByTrack;
          setTypingByTrack(parsed || {});
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        tasks,
        messages,
        directMessages,
        tracks,
        notifications,
        presence,
        typingByTrack,
        typingByDm,
        isAuthenticated,
        switchUser,
        addUser,
        updateCurrentUser,
        login,
        signup,
        verifyOtp,
        logout,
        removeUser,
        addTask,
        updateTask,
        updateTaskStatus,
        sendMessage,
        sendReply,
        pinMessage,
        deleteMessage,
        toggleReaction,
        toggleDirectMessageReaction,
        requestTaskApproval,
        approveTask,
        rejectTask,
        markNotificationRead,
        markAllNotificationsReadForUser,
        addTrack,
        addMemberToTrack,
        removeMemberFromTrack,
        renameTrack,
        deleteTrack,
        deleteTask,
        setUserPresence,
        setTyping,
        setDmTyping,
        markTrackRead,
        sendDirectMessage,
        markDmThreadRead,
        setDirectMessageStatus,
        addTaskReminder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
