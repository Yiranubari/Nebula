import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Send,
  Inbox as InboxIcon,
  Paperclip,
  Mic,
  Square,
  Check,
  CheckCheck,
  AlertCircle,
  Play,
  Pause,
  Smile,
} from "lucide-react";
import type { Attachment } from "../types";
import { uploadsService } from "../services/uploads.service";
import toast from "react-hot-toast";

const Inbox: React.FC = () => {
  const {
    currentUser,
    users,
    directMessages,
    sendDirectMessage,
    markDmThreadRead,
    setDirectMessageStatus,
    presence,
    toggleDirectMessageReaction,
    typingByDm,
    setDmTyping,
  } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const withUserId = searchParams.get("with") || "";
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  // File uploads
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const [recSeconds, setRecSeconds] = useState(0);
  const recTimerRef = useRef<number | null>(null);

  // Audio playback UI (WhatsApp-style)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>(
    {},
  );
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>(
    {},
  );
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const playbackUrlsRef = useRef<Record<string, string>>({});

  // WhatsApp-style quick reactions (same as Team Chat)
  const reactionQuick = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  const [reactionPopoverId, setReactionPopoverId] = useState<string | null>(
    null,
  );
  const [emojiPickerId, setEmojiPickerId] = useState<string | null>(null);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [emojiCategory, setEmojiCategory] = useState<string>("Recent");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("nebula.recentEmojis") || "[]";
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? (arr as string[]).slice(0, 24) : [];
    } catch {
      return [];
    }
  });
  const emojiCategories: Record<string, string[]> = {
    Recent: [],
    Smileys: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🤣",
      "😊",
      "😍",
      "😘",
      "😜",
      "🤗",
      "🤔",
      "😮",
      "😢",
      "😭",
      "😡",
      "😴",
      "😇",
      "🥳",
      "🤯",
      "😎",
    ],
    Gestures: ["👍", "👎", "👏", "🙏", "💪", "🤝", "👌", "✌️", "🤞", "👋"],
    Hearts: [
      "❤️",
      "💙",
      "💚",
      "💛",
      "🧡",
      "💜",
      "🤍",
      "🖤",
      "💔",
      "❣️",
      "💖",
      "💗",
      "💘",
    ],
    Animals: ["🐶", "🐱", "🐻", "🐼", "🐸", "🐵", "🦊", "🐰", "🐯", "🐨"],
    Food: ["🍕", "🍔", "🍟", "🌭", "🍿", "🍎", "🍊", "🍇", "🍓", "🍩"],
    Activities: ["⚽", "🏀", "🏈", "🎾", "🏓", "🎯", "🎲", "🎮", "🎵", "🎧"],
    Objects: ["📌", "📎", "🛠️", "🕒", "📅", "📝", "💬", "📱", "💡", "🔔"],
    Symbols: ["🔥", "✨", "🎉", "💯", "✅", "❌", "➕", "➖", "⭐", "🌟"],
  };
  const getEmojiList = () => {
    if (emojiCategory === "Recent") return recentEmojis;
    return emojiCategories[emojiCategory] || [];
  };
  const addRecentEmoji = (e: string) => {
    setRecentEmojis((prev) => {
      const next = [e, ...prev.filter((x) => x !== e)].slice(0, 24);
      try {
        localStorage.setItem("nebula.recentEmojis", JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const longPressTimerRef = useRef<number | null>(null);

  const formatMMSS = (s: number) => {
    if (!Number.isFinite(s) || s <= 0) return "--:--";
    const mm = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  const getPlaybackUrl = (att: Attachment) => {
    const cached = playbackUrlsRef.current[att.id];
    if (cached) return cached;
    if (att.url.startsWith("data:")) {
      try {
        const parts = att.url.split(",");
        const meta = parts[0];
        const b64 = parts[1] || "";
        const mime = att.type || meta.slice(5).split(";")[0];
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        const obj = URL.createObjectURL(blob);
        playbackUrlsRef.current[att.id] = obj;
        return obj;
      } catch {
        return att.url;
      }
    }
    return att.url;
  };

  const togglePlay = (id: string) => {
    const el = audioRefs.current[id];
    if (!el) return;
    if (playingAudioId && playingAudioId !== id) {
      const other = audioRefs.current[playingAudioId];
      if (other) other.pause();
    }
    if (el.paused) {
      el.play();
      setPlayingAudioId(id);
    } else {
      el.pause();
      setPlayingAudioId(null);
    }
  };

  useEffect(() => {
    setReactionPopoverId(null);
    setEmojiPickerId(null);
    setEmojiQuery("");

    // Clear typing when switching conversations
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
    if (withUserId) setDmTyping(withUserId, currentUser.id, false);
  }, [withUserId]);

  const dmThreadKey = (a: string, b: string) => [a, b].sort().join("|");
  const dmTypingOthers = useMemo(() => {
    if (!withUserId) return [] as string[];
    const key = dmThreadKey(currentUser.id, withUserId);
    const others = (typingByDm[key] || []).filter(
      (id) => id !== currentUser.id,
    );
    return others
      .map((id) => users.find((u) => u.id === id)?.name || "")
      .filter(Boolean);
  }, [typingByDm, users, currentUser.id, withUserId]);

  const conversations = useMemo(() => {
    const map = new Map<
      string,
      { userId: string; lastTs: number; unread: number }
    >();
    const me = currentUser.id;
    directMessages.forEach((m) => {
      const other = m.fromUserId === me ? m.toUserId : m.fromUserId;
      if (!map.has(other)) {
        map.set(other, { userId: other, lastTs: 0, unread: 0 });
      }
      const entry = map.get(other)!;
      const ts = Date.parse(m.timestamp);
      if (!Number.isNaN(ts) && ts > entry.lastTs) entry.lastTs = ts;
      // Unread if message is to me and I haven't read it
      const isToMe = m.toUserId === me;
      const readBy = new Set(m.readBy || []);
      if (isToMe && !readBy.has(me)) entry.unread += 1;
    });
    // Convert to array and sort by lastTs desc
    return Array.from(map.values()).sort((a, b) => b.lastTs - a.lastTs);
  }, [directMessages, currentUser.id]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === withUserId) || null,
    [withUserId, users],
  );

  const thread = useMemo(() => {
    if (!selectedUser) return [] as typeof directMessages;
    const me = currentUser.id;
    return directMessages
      .filter(
        (m) =>
          (m.fromUserId === me && m.toUserId === selectedUser.id) ||
          (m.fromUserId === selectedUser.id && m.toUserId === me),
      )
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  }, [directMessages, currentUser.id, selectedUser]);

  useEffect(() => {
    if (selectedUser) markDmThreadRead(selectedUser.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!withUserId && conversations.length > 0) {
      setSearchParams({ with: conversations[0].userId });
    }
  }, [withUserId, conversations, setSearchParams]);

  const onSend = async () => {
    if (!selectedUser) return;
    const trimmed = text.trim();
    if (!trimmed && pendingFiles.length === 0) return;

    setDmTyping(selectedUser.id, currentUser.id, false);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;

    setIsUploading(true);
    try {
      const atts: Attachment[] = [];
      try {
        for (const f of pendingFiles) {
          const uploaded = await uploadsService.upload(f);
          atts.push({
            id: `${Date.now()}-${f.name}`,
            name: f.name,
            size: f.size,
            type: f.type || "application/octet-stream",
            url: uploaded.url,
          });
        }
      } catch {
        toast.error("File upload failed — message not sent.");
        return;
      }
      sendDirectMessage(selectedUser.id, trimmed, atts);
      setText("");
      setPendingFiles([]);
      setTimeout(() => inputRef.current?.focus(), 0);
    } finally {
      setIsUploading(false);
    }
  };

  const onFilesPicked = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setPendingFiles((prev) => [...prev, ...list]);
  };

  const startRecording = async () => {
    if (isRecording || !selectedUser) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferredMime = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus",
      )
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: preferredMime });
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      setRecSeconds(0);
      recTimerRef.current = window.setInterval(() => {
        setRecSeconds((s) => s + 1);
      }, 1000);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        if (recTimerRef.current) {
          window.clearInterval(recTimerRef.current);
          recTimerRef.current = null;
        }
        const blob = new Blob(recordingChunksRef.current, {
          type: preferredMime,
        });
        const cleanup = () => {
          setIsRecording(false);
          setRecSeconds(0);
          recordingChunksRef.current = [];
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        };
        const filename = `voice-note-${Date.now()}.webm`;
        try {
          const uploaded = await uploadsService.upload(blob, filename);
          const att: Attachment = {
            id: `voice-${Date.now()}`,
            name: filename,
            size: blob.size,
            type: preferredMime,
            url: uploaded.url,
          };
          sendDirectMessage(selectedUser.id, "", [att]);
        } catch {
          toast.error("Could not upload voice note.");
        } finally {
          cleanup();
        }
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch {}
  };

  return (
    <div className="p-4 md:p-6 h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl text-indigo-600 dark:text-indigo-200 border border-indigo-500/20">
          <InboxIcon size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand">
            Inbox
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Direct messages with team members
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Conversation list */}
        <div className="md:col-span-4 lg:col-span-3 glass-panel rounded-2xl overflow-hidden">
          <div className=" px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            Conversations
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {conversations.length === 0 && (
              <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  No conversations yet
                </p>
                <p className="mt-1">
                  Head over to <span className="font-medium">Members</span> and
                  start a direct message with a teammate.
                </p>
              </div>
            )}
            {conversations.map((c) => {
              const user = users.find((u) => u.id === c.userId);
              if (!user) return null;
              const active = selectedUser?.id === user.id;
              const status = presence[user.id]?.inHuddleTrackId
                ? "in-huddle"
                : presence[user.id]?.status || "offline";
              return (
                <button
                  key={user.id}
                  onClick={() => navigate(`/inbox?with=${user.id}`)}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 last:border-b-0 ${
                    active ? "bg-indigo-50 dark:bg-indigo-500/20" : ""
                  }`}
                >
                  <Avatar
                    src={user.avatar}
                    name={user.name}
                    size="md"
                    showStatusDot
                    status={status as any}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {user.name}
                    </p>
                    {c.unread > 0 ? (
                      <p className="text-xs text-amber-700">
                        {c.unread} unread
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Up to date
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Thread */}
        <div className="md:col-span-8 lg:col-span-9 glass-panel rounded-2xl flex flex-col min-h-[60vh]">
          <div className="px-4 py-3 flex items-center gap-3">
            {selectedUser ? (
              <>
                <Avatar
                  src={selectedUser.avatar}
                  name={selectedUser.name}
                  size="md"
                  showStatusDot
                  status={
                    presence[selectedUser.id]?.inHuddleTrackId
                      ? ("in-huddle" as any)
                      : ((presence[selectedUser.id]?.status ||
                          "offline") as any)
                  }
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {selectedUser.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Direct message
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Select a conversation
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedUser && thread.length === 0 && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Say hello 👋
              </div>
            )}
            {thread.map((m) => {
              const mine = m.fromUserId === currentUser.id;
              const recipientOnline =
                selectedUser &&
                (presence[selectedUser.id]?.inHuddleTrackId ||
                  presence[selectedUser.id]?.status === "online");
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[75%]">
                    <div className="group relative">
                      <div
                        className={`px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                          mine
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-slate-100 dark:bg-dark text-slate-800 dark:text-slate-100 rounded-bl-none"
                        }`}
                        onMouseDown={() => {
                          if (longPressTimerRef.current)
                            window.clearTimeout(longPressTimerRef.current);
                          longPressTimerRef.current = window.setTimeout(() => {
                            setReactionPopoverId(m.id);
                          }, 350);
                        }}
                        onMouseUp={() => {
                          if (longPressTimerRef.current) {
                            window.clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        onMouseLeave={() => {
                          if (longPressTimerRef.current) {
                            window.clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        onTouchStart={() => {
                          if (longPressTimerRef.current)
                            window.clearTimeout(longPressTimerRef.current);
                          longPressTimerRef.current = window.setTimeout(() => {
                            setReactionPopoverId(m.id);
                          }, 350);
                        }}
                        onTouchEnd={() => {
                          if (longPressTimerRef.current) {
                            window.clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                      >
                        {m.content && <div className="mb-1">{m.content}</div>}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="space-y-2">
                            {m.attachments.map((att) => {
                              const isImage = att.type?.startsWith("image/");
                              const isAudio = att.type?.startsWith("audio/");
                              if (isImage) {
                                return (
                                  <img
                                    key={att.id}
                                    src={att.url}
                                    alt={att.name}
                                    className="rounded-lg max-w-full h-auto"
                                  />
                                );
                              }
                              if (isAudio) {
                                const url = getPlaybackUrl(att);
                                const prog = audioProgress[att.id] || 0;
                                const dur = audioDuration[att.id] || 0;
                                const pct =
                                  dur > 0
                                    ? Math.min(100, (prog / dur) * 100)
                                    : 0;
                                const isPlaying = playingAudioId === att.id;
                                return (
                                  <div key={att.id} className="w-full">
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => togglePlay(att.id)}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                                          mine
                                            ? "bg-white/20 hover:bg-white/30 text-white"
                                            : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100"
                                        }`}
                                        aria-label={
                                          isPlaying ? "Pause" : "Play"
                                        }
                                      >
                                        {isPlaying ? (
                                          <Pause size={16} />
                                        ) : (
                                          <Play size={16} />
                                        )}
                                      </button>
                                      <div className="flex-1">
                                        <div
                                          className={`h-2 rounded ${
                                            mine
                                              ? "bg-white/20"
                                              : "bg-slate-300 dark:bg-slate-700"
                                          }`}
                                        >
                                          <div
                                            className={`h-2 rounded ${
                                              mine
                                                ? "bg-white"
                                                : "bg-slate-600 dark:bg-slate-200"
                                            }`}
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                        <div className="mt-1 text-[11px] opacity-80">
                                          {formatMMSS(prog)} / {formatMMSS(dur)}
                                        </div>
                                      </div>
                                    </div>
                                    <audio
                                      ref={(el) => {
                                        if (!el) return;
                                        audioRefs.current[att.id] = el;
                                        // Ensure correct src
                                        if (el.src !== url) el.src = url;
                                        const onTime = () => {
                                          const t = el.currentTime || 0;
                                          setAudioProgress((prev) => ({
                                            ...prev,
                                            [att.id]: t,
                                          }));
                                        };
                                        const onMeta = () => {
                                          const d = el.duration;
                                          if (Number.isFinite(d) && d > 0) {
                                            setAudioDuration((prev) => ({
                                              ...prev,
                                              [att.id]: d,
                                            }));
                                          }
                                        };
                                        const onEnd = () => {
                                          setPlayingAudioId((cur) =>
                                            cur === att.id ? null : cur,
                                          );
                                        };
                                        el.addEventListener(
                                          "timeupdate",
                                          onTime,
                                        );
                                        el.addEventListener(
                                          "loadedmetadata",
                                          onMeta,
                                        );
                                        el.addEventListener("ended", onEnd);
                                      }}
                                      preload="metadata"
                                      className="hidden"
                                    />
                                  </div>
                                );
                              }
                              return (
                                <a
                                  key={att.id}
                                  href={att.url}
                                  download={att.name}
                                  className={`inline-flex items-center text-xs underline ${
                                    mine
                                      ? "text-white/90"
                                      : "text-slate-700 dark:text-slate-200"
                                  }`}
                                >
                                  {att.name}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {reactionPopoverId === m.id && (
                        <div
                          className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white dark:bg-surface rounded-full shadow z-20 px-2 py-1"
                          onMouseLeave={() => setReactionPopoverId(null)}
                        >
                          {reactionQuick.map((e) => (
                            <button
                              key={`quick-${e}`}
                              className="px-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                              onClick={() => {
                                toggleDirectMessageReaction(
                                  m.id,
                                  e,
                                  currentUser.id,
                                );
                                setReactionPopoverId(null);
                              }}
                              title={`React ${e}`}
                            >
                              {e}
                            </button>
                          ))}
                          <button
                            className="ml-1 px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs"
                            onClick={() => {
                              setEmojiPickerId(m.id);
                              setReactionPopoverId(null);
                            }}
                            title="More"
                          >
                            More
                          </button>
                        </div>
                      )}

                      <div
                        className={`absolute ${
                          mine
                            ? "left-0 -translate-x-full"
                            : "right-0 translate-x-full"
                        } top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
                      >
                        <button
                          className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="React"
                          onClick={() => setEmojiPickerId(m.id)}
                        >
                          <Smile size={14} />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs">
                        {(
                          Object.entries(m.reactions || {}) as Array<
                            [string, string[]]
                          >
                        )
                          .filter(([, ids]) => (ids || []).length > 0)
                          .map(([e, ids]) => {
                            const set = new Set<string>(ids || []);
                            const active = set.has(currentUser.id);
                            const count = set.size;
                            return (
                              <button
                                key={`chip-${m.id}-${e}`}
                                className={`px-2 py-1 rounded-full border ${
                                  active
                                    ? mine
                                      ? "bg-indigo-600/10 text-slate-900 border-indigo-200"
                                      : "bg-slate-200 text-slate-800 border-slate-300"
                                    : "bg-transparent text-current border-slate-300"
                                }`}
                                onClick={() =>
                                  toggleDirectMessageReaction(
                                    m.id,
                                    e,
                                    currentUser.id,
                                  )
                                }
                                title={`${e} ${count || ""}`}
                              >
                                {e} {count > 0 ? count : ""}
                              </button>
                            );
                          })}
                      </div>

                      {emojiPickerId === m.id && (
                        <div
                          className={`absolute ${
                            mine
                              ? "left-0 -translate-x-full"
                              : "right-0 translate-x-full"
                          } top-0 mt-2 glass-panel rounded-2xl shadow-lg z-20 w-64 max-w-[90vw]`}
                        >
                          <div className="p-2 ">
                            <input
                              type="text"
                              value={emojiQuery}
                              onChange={(e) => setEmojiQuery(e.target.value)}
                              placeholder="Search emoji"
                              className="w-full px-2 py-1 text-sm rounded bg-white dark:bg-dark text-slate-900 dark:text-slate-100"
                            />
                          </div>
                          <div className="px-2 pt-2 flex items-center gap-1 flex-wrap">
                            {Object.keys(emojiCategories).map((cat) => (
                              <button
                                key={`cat-${cat}`}
                                className={`px-2 py-1 rounded text-xs border ${
                                  emojiCategory === cat
                                    ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-500/30"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                                }`}
                                onClick={() => setEmojiCategory(cat)}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                          <div className="p-2 grid grid-cols-8 gap-1">
                            {getEmojiList()
                              .filter((e) =>
                                emojiQuery.trim()
                                  ? e
                                      .toLowerCase()
                                      .includes(emojiQuery.trim().toLowerCase())
                                  : true,
                              )
                              .map((e) => (
                                <button
                                  key={`pick-${e}`}
                                  className="text-base rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                  onClick={() => {
                                    toggleDirectMessageReaction(
                                      m.id,
                                      e,
                                      currentUser.id,
                                    );
                                    setEmojiPickerId(null);
                                    setEmojiQuery("");
                                    addRecentEmoji(e);
                                  }}
                                  title={`React ${e}`}
                                >
                                  {e}
                                </button>
                              ))}
                          </div>
                          <div className="p-2 ">
                            <button
                              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs"
                              onClick={() => {
                                setEmojiPickerId(null);
                                setEmojiQuery("");
                              }}
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {mine && (
                      <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500">
                        {m.status === "failed" ? (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <AlertCircle size={13} /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            {(m.readBy || []).includes(
                              selectedUser?.id || "",
                            ) ? (
                              <CheckCheck size={13} />
                            ) : (
                              <Check size={13} />
                            )}
                          </span>
                        )}
                        {m.status === "failed" && (
                          <button
                            className="ml-2 text-[11px] underline"
                            onClick={() => {
                              if (!selectedUser) return;
                              sendDirectMessage(
                                selectedUser.id,
                                m.content || "",
                                m.attachments,
                              );
                              setDirectMessageStatus(m.id, "sent");
                            }}
                          >
                            Resend
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className=" p-3">
            {dmTypingOthers.length > 0 && (
              <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
                {dmTypingOthers.join(", ")}{" "}
                {dmTypingOthers.length > 1 ? "are" : "is"} typing…
              </p>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => onFilesPicked(e.target.files)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedUser}
                className="h-[44px] px-3 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                title="Attach files"
              >
                <Paperclip size={16} />
              </button>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!selectedUser}
                className={`h-[44px] px-3 rounded-lg ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : " text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                } disabled:opacity-50 inline-flex items-center gap-2`}
                title={isRecording ? "Stop recording" : "Record voice message"}
              >
                {isRecording ? <Square size={16} /> : <Mic size={16} />}
                {isRecording && <span className="text-xs">{recSeconds}s</span>}
              </button>
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (!selectedUser) return;
                  setDmTyping(selectedUser.id, currentUser.id, true);
                  if (typingTimeoutRef.current)
                    window.clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = window.setTimeout(() => {
                    setDmTyping(selectedUser.id, currentUser.id, false);
                    typingTimeoutRef.current = null;
                  }, 1500);
                }}
                placeholder={
                  selectedUser
                    ? `Message ${selectedUser.name}`
                    : "Select a conversation"
                }
                className="flex-1 min-h-[44px] max-h-40 px-3 py-2 bg-slate-50 dark:bg-dark rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                disabled={!selectedUser || isUploading}
                onBlur={() => {
                  if (!selectedUser) return;
                  setDmTyping(selectedUser.id, currentUser.id, false);
                  if (typingTimeoutRef.current)
                    window.clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = null;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
              <button
                onClick={onSend}
                disabled={
                  !selectedUser ||
                  (text.trim().length === 0 && pendingFiles.length === 0) ||
                  isUploading
                }
                className="h-[44px] px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Send size={16} />
                Send
              </button>
            </div>
            {pendingFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {pendingFiles.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    {f.name}
                  </span>
                ))}
              </div>
            )}
            {selectedUser && (
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                Enter to send · Shift+Enter for a new line
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;
