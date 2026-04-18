/**
 * AppContext — application-wide state driven entirely by the REST API + Socket.IO.
 * All mock data and localStorage-based persistence has been removed.
 *
 * State is loaded from the server on mount and kept in sync via:
 *   • REST API calls for mutations
 *   • Socket.IO events for real-time updates from other clients
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { tasksService } from "../services/tasks.service";
import { tracksService } from "../services/tracks.service";
import { usersService } from "../services/users.service";
import { notificationsService } from "../services/notifications.service";
import {
  Task,
  User,
  Message,
  TaskStatus,
  Priority,
  Track,
  Notification,
  NotificationStatus,
  PresenceMap,
  PresenceStatus,
  TypingByDm,
  TypingByTrack,
} from "../types";
import type { DirectMessage, Attachment } from "../types";
import { useSocket } from "./SocketContext";

// ─── Context interface ────────────────────────────────────────────────────────

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
  isLoading: boolean;

  // Auth
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (name: string, email: string, password?: string, avatar?: string) => Promise<boolean>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>;

  // Users
  updateCurrentUser: (updates: Partial<Pick<User, "name" | "email" | "avatar">>) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  addUser: (user: User) => void;           // admin-only local add after API call
  switchUser: (userId: string) => void;    // dev helper — remove in prod

  // Tasks
  addTask: (task: Omit<Task, "id" | "createdAt">) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  requestTaskApproval: (taskId: string) => void;
  approveTask: (taskId: string) => Promise<void>;
  rejectTask: (taskId: string) => Promise<void>;
  addTaskReminder: (taskId: string, forUserId?: string) => void;

  // Tracks
  addTrack: (name: string) => Promise<Track | null>;
  addMemberToTrack: (trackId: string, userId: string) => Promise<void>;
  removeMemberFromTrack: (trackId: string, userId: string) => Promise<void>;
  renameTrack: (trackId: string, name: string) => Promise<void>;
  deleteTrack: (trackId: string) => Promise<void>;

  // Messages (track)
  sendMessage: (content: string, trackId?: string, attachments?: Attachment[]) => void;
  sendReply: (parentId: string, content: string, trackId?: string, attachments?: Attachment[]) => void;
  pinMessage: (messageId: string, pinned: boolean) => void;
  deleteMessage: (messageId: string) => void;
  toggleReaction: (messageId: string, emoji: string, userId: string) => void;
  markTrackRead: (trackId: string) => void;

  // Direct messages
  sendDirectMessage: (toUserId: string, content: string, attachments?: Attachment[]) => string;
  markDmThreadRead: (withUserId: string) => void;
  setDirectMessageStatus: (id: string, status: "sent" | "failed") => void;
  toggleDirectMessageReaction: (dmId: string, emoji: string, userId: string) => void;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsReadForUser: (userId: string) => Promise<void>;

  // Presence / typing (socket-driven, kept for API compat)
  setUserPresence: (userId: string, status: PresenceStatus, extra?: Partial<{ inHuddleTrackId: string | null }>) => void;
  setTyping: (trackId: string, userId: string, isTyping: boolean) => void;
  setDmTyping: (withUserId: string, userId: string, isTyping: boolean) => void;
}

// ─── Context creation ─────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Auth storage keys ────────────────────────────────────────────────────────

const AUTH_KEY = "nebula.auth.v1";
const USER_KEY = "nebula.user.v1";

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { socket } = useSocket();

  // ─── Core state ────────────────────────────────────────────────────────────

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try { return localStorage.getItem(AUTH_KEY) === "true"; } catch { return false; }
  });

  const [isLoading, setIsLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState<User>({
    id: "",
    name: "",
    email: "",
    role: "MEMBER",
  });

  const [users, setUsers]                       = useState<User[]>([]);
  const [tasks, setTasks]                       = useState<Task[]>([]);
  const [messages, setMessages]                 = useState<Message[]>([]);
  const [tracks, setTracks]                     = useState<Track[]>([]);
  const [notifications, setNotifications]       = useState<Notification[]>([]);
  const [directMessages, setDirectMessages]     = useState<DirectMessage[]>([]);
  const [presence, setPresence]                 = useState<PresenceMap>({});
  const [typingByTrack, setTypingByTrack]       = useState<TypingByTrack>({});
  const [typingByDm, setTypingByDm]             = useState<TypingByDm>({});

  // ─── Bootstrap: load everything on auth ────────────────────────────────────

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    try {
      const [me, allUsers, allTasks, allTracks, allNotifs] = await Promise.all([
        usersService.getMe(),
        usersService.list(),
        tasksService.list(),
        tracksService.list(),
        notificationsService.list(),
      ]);

      setCurrentUser(me);
      setUsers(allUsers);
      setTasks(allTasks as unknown as Task[]);
      setTracks(allTracks);
      setNotifications(allNotifs as unknown as Notification[]);

      // Build initial presence map from user list
      const now = new Date().toISOString();
      const presMap: PresenceMap = {};
      allUsers.forEach((u) => {
        presMap[u.id] = { status: u.id === me.id ? "online" : "offline", lastActive: now };
      });
      setPresence(presMap);

      // Load messages for first (most recent) track
      if (allTracks.length > 0) {
        await loadTrackMessages(allTracks[0].id);
      }

      localStorage.setItem(USER_KEY, me.id);
    } catch (err) {
      console.error("[AppContext] bootstrap failed:", err);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated) bootstrap();
  }, [isAuthenticated, bootstrap]);

  const loadTrackMessages = async (trackId: string) => {
    try {
      const result = await tracksService.getMessages(trackId);
      const normalised = (result.items ?? []).map((m: any) => ({
        ...m,
        timestamp: m.createdAt ?? m.timestamp,
        trackId: m.trackId ?? trackId,
      }));
      setMessages((prev) => {
        // Merge without duplicates
        const ids = new Set(prev.map((x) => x.id));
        return [...prev, ...normalised.filter((m: Message) => !ids.has(m.id))];
      });
    } catch {}
  };

  // ─── Socket.IO real-time listeners ─────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    // Presence updates
    const onPresence = (payload: { userId: string; info: { status: PresenceStatus; lastActive: string; inHuddleTrackId?: string | null } }) => {
      setPresence((prev) => ({
        ...prev,
        [payload.userId]: payload.info,
      }));
    };

    // Typing indicators
    const onTyping = (payload: { trackId?: string; dmKey?: string; userIds: string[] }) => {
      if (payload.trackId) {
        setTypingByTrack((prev) => ({ ...prev, [payload.trackId!]: payload.userIds }));
      }
      if (payload.dmKey) {
        setTypingByDm((prev) => ({ ...prev, [payload.dmKey!]: payload.userIds }));
      }
    };

    // New track message
    const onMessageNew = (message: any) => {
      const normalised: Message = {
        ...message,
        timestamp: message.createdAt ?? message.timestamp,
        trackId: message.trackId,
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === normalised.id)) return prev;
        return [...prev, normalised];
      });
    };

    // Updated track message (reaction, read, pin)
    const onMessageUpdated = (message: any) => {
      const normalised: Message = { ...message, timestamp: message.createdAt ?? message.timestamp };
      setMessages((prev) =>
        prev.map((m) => (m.id === normalised.id ? normalised : m))
      );
    };

    // New DM
    const onDmNew = (dm: any) => {
      const normalised: DirectMessage = {
        ...dm,
        timestamp: dm.createdAt ?? dm.timestamp,
        status: "sent",
      };
      setDirectMessages((prev) => {
        if (prev.some((m) => m.id === normalised.id)) return prev;
        return [...prev, normalised];
      });
    };

    // Updated DM (reaction)
    const onDmUpdated = (dm: any) => {
      const normalised: DirectMessage = { ...dm, timestamp: dm.createdAt ?? dm.timestamp };
      setDirectMessages((prev) =>
        prev.map((m) => (m.id === normalised.id ? normalised : m))
      );
    };

    // Incoming real-time notification
    const onNotificationNew = (notif: any) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      toast(`🔔 New notification`, { duration: 3000 });
    };

    socket.on("presence:update", onPresence);
    socket.on("typing:update", onTyping);
    socket.on("message:new", onMessageNew);
    socket.on("message:updated", onMessageUpdated);
    socket.on("dm:new", onDmNew);
    socket.on("dm:updated", onDmUpdated);
    socket.on("notification:new", onNotificationNew);

    return () => {
      socket.off("presence:update", onPresence);
      socket.off("typing:update", onTyping);
      socket.off("message:new", onMessageNew);
      socket.off("message:updated", onMessageUpdated);
      socket.off("dm:new", onDmNew);
      socket.off("dm:updated", onDmUpdated);
      socket.off("notification:new", onNotificationNew);
    };
  }, [socket]);

  // ─── Auth ──────────────────────────────────────────────────────────────────

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.data.accessToken) {
        localStorage.setItem("nebula.accessToken", res.data.accessToken);
      }
      localStorage.setItem(AUTH_KEY, "true");
      if (res.data.user) setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      toast.success("Welcome back!");
      return true;
    } catch {
      return false;
    }
  };

  const signup = async (name: string, email: string, password?: string, avatar?: string): Promise<boolean> => {
    try {
      const res = await api.post("/auth/register", { name, email, password, avatar });
      toast.success(res.data.message || "Account created — please verify your email.");
      return true;
    } catch {
      return false;
    }
  };

  const verifyOtp = async (email: string, otp: string): Promise<boolean> => {
    try {
      const res = await api.post("/auth/verify-otp", { email, otp });
      if (res.data.accessToken) {
        localStorage.setItem("nebula.accessToken", res.data.accessToken);
      }
      localStorage.setItem(AUTH_KEY, "true");
      if (res.data.user) setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      toast.success("Email verified!");
      return true;
    } catch {
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("nebula.accessToken");
    localStorage.setItem(AUTH_KEY, "false");
    setIsAuthenticated(false);
    setCurrentUser({ id: "", name: "", email: "", role: "MEMBER" });
    setUsers([]); setTasks([]); setMessages([]); setTracks([]);
    setNotifications([]); setDirectMessages([]); setPresence({});
    window.location.hash = "#/login";
  };

  // ─── Users ─────────────────────────────────────────────────────────────────

  const addUser = (user: User) => {
    setUsers((prev) => (prev.some((u) => u.id === user.id) ? prev : [...prev, user]));
  };

  const switchUser = (userId: string) => {
    const u = users.find((u) => u.id === userId);
    if (u) setCurrentUser(u);
  };

  const updateCurrentUser = async (updates: Partial<Pick<User, "name" | "email" | "avatar">>) => {
    try {
      const updated = await usersService.updateMe(updates);
      setCurrentUser(updated);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success("Profile updated");
    } catch {}
  };

  const removeUser = async (userId: string) => {
    try {
      await usersService.delete(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {}
  };

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  const addTask = async (task: Omit<Task, "id" | "createdAt">) => {
    try {
      const created = await tasksService.create(task as any);
      setTasks((prev) => [...prev, created as unknown as Task]);
    } catch {}
  };

  const updateTask = async (task: Task) => {
    try {
      const updated = await tasksService.update(task.id, task as any);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated as unknown as Task : t)));
    } catch {}
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      // For non-admin going to DONE → intercept and move to REVIEW
      const isAdmin = currentUser.role === "ADMIN";
      const finalStatus = (!isAdmin && status === TaskStatus.DONE) ? TaskStatus.REVIEW : status;
      const updated = await tasksService.update(taskId, { status: finalStatus as any });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated as unknown as Task : t)));
    } catch {}
  };

  const deleteTask = async (taskId: string) => {
    try {
      await tasksService.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {}
  };

  const requestTaskApproval = (taskId: string) => {
    // Optimistic — the server creates the notification on status change
    updateTaskStatus(taskId, TaskStatus.REVIEW);
  };

  const approveTask = async (taskId: string) => {
    try {
      const updated = await tasksService.update(taskId, { status: "DONE" as any });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated as unknown as Task : t)));
    } catch {}
  };

  const rejectTask = async (taskId: string) => {
    try {
      const updated = await tasksService.update(taskId, { status: "REVIEW" as any });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated as unknown as Task : t)));
    } catch {}
  };

  const addTaskReminder = (_taskId: string, _forUserId?: string) => {
    // Placeholder — implement push notification via server when needed
  };

  // ─── Tracks ────────────────────────────────────────────────────────────────

  const addTrack = async (name: string): Promise<Track | null> => {
    try {
      const track = await tracksService.create({ name });
      setTracks((prev) => [track, ...prev]);
      return track;
    } catch {
      return null;
    }
  };

  const addMemberToTrack = async (trackId: string, userId: string) => {
    try {
      await tracksService.addMember(trackId, userId);
      setTracks((prev) =>
        prev.map((t) =>
          t.id === trackId && !t.members.includes(userId)
            ? { ...t, members: [...t.members, userId] }
            : t
        )
      );
    } catch {}
  };

  const removeMemberFromTrack = async (trackId: string, userId: string) => {
    try {
      await tracksService.removeMember(trackId, userId);
      setTracks((prev) =>
        prev.map((t) =>
          t.id === trackId
            ? { ...t, members: t.members.filter((id) => id !== userId) }
            : t
        )
      );
    } catch {}
  };

  const renameTrack = async (trackId: string, name: string) => {
    // Optimistic update
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, name } : t))
    );
    try {
      await tracksService.rename(trackId, name);
    } catch {
      // Rollback would go here — omitted for brevity
    }
  };

  const deleteTrack = async (trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    try {
      await tracksService.delete(trackId);
    } catch {}
  };

  // ─── Messages ─────────────────────────────────────────────────────────────

  const sendMessage = (content: string, trackId?: string, _attachments?: Attachment[]) => {
    const tid = trackId ?? tracks[0]?.id;
    if (!tid || !socket) return;
    // Emit via socket — the server will broadcast message:new back
    socket.emit("message:send", {
      trackId: tid,
      content,
      ...((_attachments?.length) ? { attachments: _attachments } : {}),
    });
  };

  const sendReply = (parentId: string, content: string, trackId?: string, _attachments?: Attachment[]) => {
    const tid = trackId ?? tracks[0]?.id;
    if (!tid || !socket) return;
    socket.emit("message:send", {
      trackId: tid,
      content,
      parentId,
      ...((_attachments?.length) ? { attachments: _attachments } : {}),
    });
  };

  const pinMessage = (messageId: string, pinned: boolean) => {
    if (!socket) return;
    socket.emit("message:pin", { messageId, pinned });
  };

  const deleteMessage = (messageId: string) => {
    // Optimistic remove — server-side delete not yet wired to a socket event
    setMessages((prev) => prev.filter((m) => m.id !== messageId && m.parentId !== messageId));
  };

  const toggleReaction = (messageId: string, emoji: string, _userId: string) => {
    if (!socket) return;
    socket.emit("message:react", { messageId, emoji });
  };

  const markTrackRead = (trackId: string) => {
    // Emit read events for unread messages in this track
    messages
      .filter((m) => (m.trackId ?? tracks[0]?.id) === trackId && !m.readBy?.includes(currentUser.id))
      .forEach((m) => socket?.emit("message:read", { messageId: m.id }));
  };

  // ─── Direct messages ───────────────────────────────────────────────────────

  const sendDirectMessage = (toUserId: string, content: string, _attachments?: Attachment[]): string => {
    const tempId = `temp-${Date.now()}`;
    if (!socket) return tempId;
    // Optimistic append
    const optimistic: DirectMessage = {
      id: tempId,
      fromUserId: currentUser.id,
      toUserId,
      content,
      timestamp: new Date().toISOString(),
      reactions: {},
      readBy: [currentUser.id],
      status: "sent",
      ...((_attachments?.length) ? { attachments: _attachments } : {}),
    };
    setDirectMessages((prev) => [...prev, optimistic]);
    socket.emit("dm:send", {
      toUserId,
      content,
      ...((_attachments?.length) ? { attachments: _attachments } : {}),
    });
    return tempId;
  };

  const markDmThreadRead = (withUserId: string) => {
    const me = currentUser.id;
    setDirectMessages((prev) =>
      prev.map((m) => {
        const isBetween =
          (m.fromUserId === me && m.toUserId === withUserId) ||
          (m.fromUserId === withUserId && m.toUserId === me);
        if (!isBetween) return m;
        const readBy = new Set(m.readBy ?? []);
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

  const toggleDirectMessageReaction = (dmId: string, emoji: string, _userId: string) => {
    if (!socket) return;
    socket.emit("dm:react", { messageId: dmId, emoji });
  };

  // ─── Notifications ─────────────────────────────────────────────────────────

  const markNotificationRead = async (id: string) => {
    try {
      await notificationsService.update(id, { read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {}
  };

  const markAllNotificationsReadForUser = async (userId: string) => {
    const targets = notifications.filter(
      (n) => (n.recipientId === userId || n.requesterId === userId) && !n.read
    );
    await Promise.all(targets.map((n) => markNotificationRead(n.id)));
  };

  // ─── Presence / typing ─────────────────────────────────────────────────────

  const setUserPresence = (
    userId: string,
    status: PresenceStatus,
    extra?: Partial<{ inHuddleTrackId: string | null }>
  ) => {
    const now = new Date().toISOString();
    setPresence((prev) => ({
      ...prev,
      [userId]: {
        status,
        lastActive: now,
        inHuddleTrackId:
          extra && "inHuddleTrackId" in extra
            ? extra.inHuddleTrackId ?? null
            : prev[userId]?.inHuddleTrackId ?? null,
      },
    }));
    // Tell server
    if (userId === currentUser.id) {
      socket?.emit("presence:set", { status });
    }
  };

  const dmThreadKey = (a: string, b: string) => [a, b].sort().join("|");

  const setTyping = (trackId: string, userId: string, isTyping: boolean) => {
    setTypingByTrack((prev) => {
      const cur = new Set(prev[trackId] ?? []);
      if (isTyping) cur.add(userId); else cur.delete(userId);
      return { ...prev, [trackId]: Array.from(cur) };
    });
    if (userId === currentUser.id) {
      if (isTyping) socket?.emit("typing:start", { trackId });
      else socket?.emit("typing:stop", { trackId });
    }
  };

  const setDmTyping = (withUserId: string, userId: string, isTyping: boolean) => {
    const key = dmThreadKey(currentUser.id, withUserId);
    setTypingByDm((prev) => {
      const cur = new Set(prev[key] ?? []);
      if (isTyping) cur.add(userId); else cur.delete(userId);
      const arr = Array.from(cur);
      if (arr.length === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: arr };
    });
    if (userId === currentUser.id) {
      if (isTyping) socket?.emit("typing:start", { dmKey: key });
      else socket?.emit("typing:stop", { dmKey: key });
    }
  };

  // ─── Presence: send online/idle on visibility change ───────────────────────

  useEffect(() => {
    if (!isAuthenticated || !currentUser.id) return;
    const onVisibility = () => {
      setUserPresence(currentUser.id, document.hidden ? "idle" : "online");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser.id, socket]);

  // ─── Context value ─────────────────────────────────────────────────────────

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        tasks,
        messages,
        tracks,
        notifications,
        directMessages,
        presence,
        typingByTrack,
        typingByDm,
        isAuthenticated,
        isLoading,
        login,
        signup,
        verifyOtp,
        logout,
        addUser,
        switchUser,
        updateCurrentUser,
        removeUser,
        addTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        requestTaskApproval,
        approveTask,
        rejectTask,
        addTaskReminder,
        addTrack,
        addMemberToTrack,
        removeMemberFromTrack,
        renameTrack,
        deleteTrack,
        sendMessage,
        sendReply,
        pinMessage,
        deleteMessage,
        toggleReaction,
        markTrackRead,
        sendDirectMessage,
        markDmThreadRead,
        setDirectMessageStatus,
        toggleDirectMessageReaction,
        markNotificationRead,
        markAllNotificationsReadForUser,
        setUserPresence,
        setTyping,
        setDmTyping,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
