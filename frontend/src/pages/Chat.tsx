import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  Send,
  Hash,
  Plus,
  Users,
  Edit,
  Trash2,
  Pin,
  PinOff,
  Mic,
  Square,
  Play,
  Pause,
  PhoneCall,
  Smile,
  Search,
  UserPlus,
  UserMinus,
} from "lucide-react";
import Avatar from "../components/Avatar";
import Select from "../components/Select";
import { Attachment } from "../types";
import HuddleCall from "../components/HuddleCall";
import { uploadsService } from "../services/uploads.service";
import toast from "react-hot-toast";

const Chat = () => {
  const {
    messages,
    currentUser,
    users,
    sendMessage,
    sendReply,
    pinMessage,
    deleteMessage,
    tracks,
    addTrack,
    addMemberToTrack,
    removeMemberFromTrack,
    renameTrack,
    deleteTrack,
    presence,
    typingByTrack,
    setTyping,
    toggleReaction,
    markTrackRead,
  } = useApp();
  const [manageMembers, setManageMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(
    null,
  );
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTrackId, setActiveTrackId] = useState<string>(
    () => tracks[0]?.id || "track-general",
  );
  const [newTrackName, setNewTrackName] = useState("");
  const [creating, setCreating] = useState(false);
  const isAdmin = currentUser.role === "ADMIN";
  const activeTrackMembers =
    tracks.find((t) => t.id === activeTrackId)?.members ?? [];
  const isTrackMember = activeTrackMembers.includes(currentUser.id);
  const canPost = isAdmin || isTrackMember;
  const [huddleOpen, setHuddleOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const [recSeconds, setRecSeconds] = useState(0);
  const recTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>(
    {},
  );
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>(
    {},
  );
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const playbackUrlsRef = useRef<Record<string, string>>({});
  const typingTimeoutRef = useRef<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mentionStartRef = useRef<number | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  type MentionItem = {
    kind: "user" | "track";
    id: string;
    label: string;
    sublabel?: string;
    avatar?: string;
    handle: string;
  };
  const [mentionItems, setMentionItems] = useState<MentionItem[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [replyToId, setReplyToId] = useState<string | null>(null);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTrackId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tid = params.get("trackId");
    const mid = params.get("messageId");
    if (tid) setActiveTrackId(tid);
    if (mid) setHighlightId(mid);
  }, [location.search]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`msg-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-indigo-400");
      const t = window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-indigo-400");
        setHighlightId(null);
        navigate({ pathname: "/chat" }, { replace: true });
      }, 2000);
      return () => window.clearTimeout(t);
    }
  }, [highlightId, navigate]);

  useEffect(() => {
    return () => {
      try {
        mediaRecorderRef.current?.stop();
      } catch {}
      if (recTimerRef.current) {
        window.clearInterval(recTimerRef.current);
        recTimerRef.current = null;
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      Object.values(playbackUrlsRef.current).forEach((u) => {
        try {
          URL.revokeObjectURL(u as string);
        } catch {}
      });
      playbackUrlsRef.current = {};
    };
  }, []);

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

  const formatMMSS = (s: number) => {
    if (!Number.isFinite(s) || s <= 0) return "--:--";
    const mm = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };
  const renderMessageText = (text: string) => {
    const elements: React.ReactNode[] = [];
    const regex = /@[A-Za-z0-9_\-]+/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
      const start = m.index;
      const end = start + m[0].length;
      if (start > lastIndex) {
        elements.push(text.slice(lastIndex, start));
      }
      const raw = m[0];
      const handle = raw.slice(1).toLowerCase();
      const matchedUser = users.find((u) => {
        const first = (u.name.split(/\s+/)[0] || "").toLowerCase();
        const nospace = u.name.toLowerCase().replace(/\s+/g, "");
        return handle === first || handle === nospace;
      });
      if (matchedUser) {
        elements.push(
          <Link
            key={`${matchedUser.id}-${start}`}
            to={`/profile?userId=${encodeURIComponent(matchedUser.id)}`}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800"
            title={`View ${matchedUser.name}'s profile`}
            onClick={(e) => e.stopPropagation()}
          >
            {raw}
          </Link>,
        );
      } else {
        const matchedTrack = tracks.find(
          (t) => t.name.toLowerCase() === handle,
        );
        if (matchedTrack) {
          elements.push(
            <Link
              key={`${matchedTrack.id}-${start}`}
              to={`/chat?trackId=${encodeURIComponent(matchedTrack.id)}`}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 hover:text-violet-800"
              title={`Open #${matchedTrack.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              {raw}
            </Link>,
          );
        } else {
          elements.push(raw);
        }
      }
      lastIndex = end;
    }
    if (lastIndex < text.length) {
      elements.push(text.slice(lastIndex));
    }
    return <>{elements}</>;
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

  const startRecording = async () => {
    if (isRecording) return;
    if (!canPost) return;
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
        if (e.data && e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
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
          sendMessage("", activeTrackId, [att]);
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

  const onSendReplyWrapper = () => {
    if (!replyToId) return;
    const run = async () => {
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
        toast.error("File upload failed. Reply not sent.");
        return;
      }
      sendReply(replyToId, inputText, activeTrackId, atts);
      setInputText("");
      setPendingFiles([]);
      setReplyToId(null);
    };
    run();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && pendingFiles.length === 0) return;
    setIsUploading(true);
    try {
      const atts: Attachment[] = [];
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
      sendMessage(inputText, activeTrackId, atts);
      setInputText("");
      setPendingFiles([]);
    } catch {
      toast.error("File upload failed. Message not sent.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const typingOthers = (
    typingByTrack[activeTrackId]?.filter((id) => id !== currentUser.id) || []
  )
    .map((id) => users.find((u) => u.id === id)?.name || "")
    .filter(Boolean);

  const lastOutgoingId = useMemo(() => {
    const inTrack = messages
      .filter(
        (m) =>
          (m.trackId || tracks[0]?.id || "track-general") === activeTrackId &&
          !m.parentId &&
          m.userId === currentUser.id,
      )
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    return inTrack.length ? inTrack[inTrack.length - 1].id : null;
  }, [messages, tracks, activeTrackId, currentUser.id]);

  useEffect(() => {
    markTrackRead(activeTrackId);
  }, [activeTrackId, currentUser.id]);

  useEffect(() => {
    markTrackRead(activeTrackId);
  }, [messages.length, activeTrackId]);

  const buildMentionItems = (query: string): MentionItem[] => {
    const q = (query || "").toLowerCase();
    const userItems: MentionItem[] = users
      .map((u) => {
        const first = (u.name.split(/\s+/)[0] || "").toLowerCase();
        const nospace = u.name.toLowerCase().replace(/\s+/g, "");
        return [
          { key: first, u },
          { key: nospace, u },
        ];
      })
      .flat()
      .filter(
        (x, idx, arr) =>
          arr.findIndex((y) => y.key === x.key && y.u.id === x.u.id) === idx,
      )
      .filter((x) => (q ? x.key.startsWith(q) : true))
      .slice(0, 20)
      .map((x) => ({
        kind: "user" as const,
        id: x.u.id,
        label: x.u.name,
        sublabel: `@${x.key}`,
        avatar: x.u.avatar,
        handle: x.key,
      }));

    const trackItems: MentionItem[] = tracks
      .map((t) => ({ t, key: t.name.toLowerCase() }))
      .filter((x) => (q ? x.key.startsWith(q) : true))
      .slice(0, 20)
      .map((x) => ({
        kind: "track" as const,
        id: x.t.id,
        label: `#${x.t.name}`,
        sublabel: `@${x.key}`,
        handle: x.key,
      }));

    return [...userItems, ...trackItems].slice(0, 20);
  };

  const updateMentionContext = (val: string, caret: number | null) => {
    const pos = caret ?? val.length;
    const upto = val.slice(0, pos);
    const m = upto.match(/@([A-Za-z0-9_\-]*)$/);
    if (m) {
      mentionStartRef.current = pos - m[1].length - 1;
      const q = m[1] || "";
      const items = buildMentionItems(q);
      setMentionQuery(q);
      setMentionItems(items);
      setMentionIndex(0);
      setMentionOpen(items.length > 0);
    } else {
      mentionStartRef.current = null;
      setMentionOpen(false);
      setMentionQuery("");
      setMentionItems([]);
      setMentionIndex(0);
    }
  };

  const insertMention = (item: MentionItem) => {
    if (mentionStartRef.current == null) return;
    const el = inputRef.current;
    const val = inputText;
    const caret = el?.selectionStart ?? val.length;
    const start = mentionStartRef.current;
    const before = val.slice(0, start);
    const after = val.slice(caret);
    const insert = `@${item.handle} `;
    const nextVal = before + insert + after;
    setInputText(nextVal);
    setMentionOpen(false);
    setMentionItems([]);
    setMentionQuery("");
    setMentionIndex(0);
    mentionStartRef.current = null;
    const nextPos = before.length + insert.length;
    setTimeout(() => {
      try {
        const node = inputRef.current;
        if (node) node.setSelectionRange(nextPos, nextPos);
      } catch {}
    }, 0);
  };

  const pinnedForTrack = useMemo(() => {
    const list = messages.filter(
      (m) =>
        (m.trackId || tracks[0]?.id || "track-general") === activeTrackId &&
        m.pinned,
    );
    return list
      .slice()
      .sort(
        (a, b) => Date.parse(b.timestamp || "") - Date.parse(a.timestamp || ""),
      );
  }, [messages, activeTrackId, tracks]);
  const hasPinnedForTrack = pinnedForTrack.length > 0;
  const showPinnedBanner =
    hasPinnedForTrack &&
    !manageMembers &&
    !renaming &&
    !confirmDelete &&
    !creating;
  const primaryPinned = pinnedForTrack[0];
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden bg-transparent">
      {renaming && currentUser.role === "ADMIN" && (
        <div className="px-6 py-2 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl flex items-center gap-2 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="New track name"
            className="px-3 py-2 rounded bg-white dark:bg-dark text-sm flex-1 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button
            className="px-3 py-2 rounded bg-slate-800 text-white text-sm hover:bg-slate-900"
            onClick={async () => {
              try {
                await renameTrack(activeTrackId, renameValue.trim());
              } catch {
              } finally {
                setRenaming(false);
              }
            }}
            disabled={!renameValue.trim()}
          >
            Save
          </button>
          <button
            className="px-3 py-2 rounded text-slate-700 dark:text-slate-200 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setRenaming(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {confirmDelete && currentUser.role === "ADMIN" && (
        <div className="px-6 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <span className="text-sm text-red-700">
            Delete{" "}
            <strong>
              #
              {tracks.find((t) => t.id === activeTrackId)?.name || "this track"}
            </strong>
            ? All messages and pinned items will be permanently removed. This
            cannot be undone.
          </span>
          <button
            className="ml-auto px-3 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700"
            onClick={async () => {
              const toDelete = activeTrackId;
              try {
                await deleteTrack(toDelete);
                const next =
                  tracks.find((t) => t.id !== toDelete)?.id || "track-general";
                setActiveTrackId(next);
              } catch {
              } finally {
                setConfirmDelete(false);
              }
            }}
          >
            Delete
          </button>
          <button
            className="px-3 py-2 rounded border border-red-200 text-red-700 text-sm"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </button>
        </div>
      )}
      {manageMembers &&
        currentUser.role === "ADMIN" &&
        (() => {
          const activeTrack = tracks.find((t) => t.id === activeTrackId);
          const memberIds = new Set(activeTrack?.members ?? []);
          const query = memberSearch.trim().toLowerCase();
          const matchesQuery = (u: (typeof users)[number]) =>
            !query ||
            u.name.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query);
          const inTrack = users.filter(
            (u) => memberIds.has(u.id) && matchesQuery(u),
          );
          const availableToAdd = users.filter(
            (u) => !memberIds.has(u.id) && matchesQuery(u),
          );

          const handleAdd = (userId: string) =>
            addMemberToTrack(activeTrackId, userId).catch(() => {});
          const handleRemove = (userId: string) =>
            removeMemberFromTrack(activeTrackId, userId).catch(() => {});

          const renderRow = (u: (typeof users)[number], kind: "in" | "out") => {
            const presenceStatus = presence[u.id]?.inHuddleTrackId
              ? ("in-huddle" as const)
              : ((presence[u.id]?.status || "offline") as any);
            const isSelf = u.id === currentUser.id;
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/60 dark:bg-white/[0.02] hover:border-indigo-500/30 transition-colors"
              >
                <Avatar
                  src={u.avatar}
                  name={u.name}
                  size="sm"
                  status={presenceStatus}
                  showStatusDot
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {u.name}
                      {isSelf && (
                        <span className="ml-1.5 text-[10px] text-slate-400">
                          (you)
                        </span>
                      )}
                    </p>
                    {u.role === "ADMIN" && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        Admin
                      </span>
                    )}
                    {presence[u.id]?.inHuddleTrackId && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                        In huddle
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {u.email}
                  </p>
                </div>
                {kind === "in" ? (
                  <button
                    onClick={() => handleRemove(u.id)}
                    disabled={isSelf}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-700 dark:text-red-300 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                      isSelf ? "You can't remove yourself" : "Remove from track"
                    }
                  >
                    <UserMinus size={12} />
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => handleAdd(u.id)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-indigo-200 dark:border-indigo-400/30 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-1"
                  >
                    <UserPlus size={12} />
                    Add
                  </button>
                )}
              </div>
            );
          };

          return (
            <div className="px-6 py-4 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                    Manage members
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {memberIds.size} member{memberIds.size === 1 ? "" : "s"} in
                    #{activeTrack?.name}
                  </p>
                </div>
                <button
                  className="px-3 py-1.5 text-xs rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5"
                  onClick={() => {
                    setManageMembers(false);
                    setMemberSearch("");
                  }}
                >
                  Done
                </button>
              </div>

              <div className="relative mb-3">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members by name or email"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white/80 dark:bg-white/[0.04] focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      In this track · {inTrack.length}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {inTrack.length === 0 ? (
                      <p className="text-xs text-slate-400 px-3 py-3">
                        {query ? "No matches." : "No members yet."}
                      </p>
                    ) : (
                      inTrack.map((u) => renderRow(u, "in"))
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Available to add · {availableToAdd.length}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {availableToAdd.length === 0 ? (
                      <p className="text-xs text-slate-400 px-3 py-3">
                        {query
                          ? "No matches."
                          : "Everyone's already in this track."}
                      </p>
                    ) : (
                      availableToAdd.map((u) => renderRow(u, "out"))
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      <div className="h-16 flex items-center justify-between px-6 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl shrink-0 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-200 border border-indigo-500/20 rounded-xl flex items-center justify-center shadow-sm">
            <Hash size={20} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <Select<string>
                value={activeTrackId}
                onChange={setActiveTrackId}
                className="!px-2.5 !py-1 text-sm !font-semibold text-slate-800 dark:text-slate-100"
                ariaLabel="Select chat track"
                options={tracks.map((t) => ({
                  value: t.id,
                  label: `#${t.name}`,
                }))}
              />
              <button
                onClick={() => setCreating((v) => !v)}
                className={`p-1 rounded border border-transparent ${
                  isAdmin
                    ? "text-indigo-600 hover:text-indigo-700 hover:border-indigo-200"
                    : "text-slate-400 cursor-not-allowed"
                }`}
                title="Create new track"
                disabled={!isAdmin}
              >
                <Plus size={18} />
              </button>
              <button
                onClick={() => setHuddleOpen(true)}
                className={`p-1 rounded border border-transparent ${
                  canPost
                    ? "text-indigo-600 hover:text-indigo-700 hover:border-indigo-200"
                    : "text-slate-400 cursor-not-allowed"
                }`}
                title="Open huddle for this track"
                disabled={!canPost}
              >
                <PhoneCall size={18} />
              </button>
              <button
                onClick={() => setManageMembers((v) => !v)}
                className={`p-1 rounded border border-transparent ${
                  isAdmin
                    ? "text-indigo-600 hover:text-indigo-700 hover:border-indigo-200"
                    : "text-slate-400 cursor-not-allowed"
                }`}
                title="Manage members"
                disabled={!isAdmin}
              >
                <Users size={18} />
              </button>
              <button
                onClick={() => {
                  setRenaming(true);
                  setRenameValue(
                    tracks.find((t) => t.id === activeTrackId)?.name || "",
                  );
                }}
                className={`p-1 rounded border border-transparent ${
                  isAdmin
                    ? "text-slate-600 hover:text-slate-700 hover:border-slate-200"
                    : "text-slate-400 cursor-not-allowed"
                }`}
                title="Rename track"
                disabled={!isAdmin}
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className={`p-1 rounded border border-transparent ${
                  isAdmin && activeTrackId !== "track-general"
                    ? "text-red-600 hover:text-red-700 hover:border-red-200"
                    : "text-slate-300 cursor-not-allowed"
                }`}
                title="Delete track"
                disabled={!isAdmin || activeTrackId === "track-general"}
              >
                <Trash2 size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {(() => {
                const n = (tracks.find((t) => t.id === activeTrackId)?.members || []).length;
                return `${n} ${n === 1 ? "member" : "members"}`;
              })()}
            </p>
          </div>
        </div>
        <div className="flex -space-x-2">
          {(tracks.find((t) => t.id === activeTrackId)?.members || [])
            .map((id) => users.find((u) => u.id === id))
            .filter(Boolean)
            .slice(0, 5)
            .map((u) => (
              <React.Fragment key={u!.id}>
                <Avatar
                  src={u!.avatar}
                  name={u!.name}
                  size="md"
                  className="border-2 border-white"
                  status={
                    presence[u!.id]?.inHuddleTrackId
                      ? "in-huddle"
                      : presence[u!.id]?.status || "offline"
                  }
                  showStatusDot
                />
              </React.Fragment>
            ))}
        </div>
      </div>

      {creating && currentUser.role === "ADMIN" && (
        <div className="px-6 py-2 bg-indigo-500/10 dark:bg-indigo-500/10 backdrop-blur-xl flex items-center gap-2">
          <input
            type="text"
            value={newTrackName}
            onChange={(e) => setNewTrackName(e.target.value)}
            placeholder="New track name (e.g., design, backend)"
            className="px-3 py-2 rounded border border-indigo-200 dark:border-indigo-400/30 bg-white dark:bg-white/5 text-sm flex-1 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button
            className="px-3 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700"
            onClick={async () => {
              const created = await addTrack(newTrackName.trim());
              if (created) {
                setActiveTrackId(created.id);
                setNewTrackName("");
                setCreating(false);
              }
            }}
            disabled={!newTrackName.trim()}
          >
            Create
          </button>
          <button
            className="px-3 py-2 rounded border border-indigo-200 text-indigo-700 text-sm"
            onClick={() => setCreating(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {huddleOpen && (
        <HuddleCall
          trackId={activeTrackId}
          trackName={
            tracks.find((t) => t.id === activeTrackId)?.name || "general"
          }
          onClose={() => setHuddleOpen(false)}
        />
      )}

      {showPinnedBanner && (
        <div className="fixed top-[7.5rem] md:top-16 left-0 right-0 md:left-64 z-30 px-4 md:px-6 bg-white dark:bg-surface h-14 flex items-center shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 bg-slate-50 dark:bg-dark "
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!primaryPinned) return;
              const el = document.getElementById(`msg-${primaryPinned.id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("ring-2", "ring-indigo-400");
                window.setTimeout(() => {
                  el.classList.remove("ring-2", "ring-indigo-400");
                }, 1800);
              }
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              if (!primaryPinned) return;
              const el = document.getElementById(`msg-${primaryPinned.id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("ring-2", "ring-indigo-400");
                window.setTimeout(() => {
                  el.classList.remove("ring-2", "ring-indigo-400");
                }, 1800);
              }
            }}
            aria-label="Jump to pinned message"
          >
            <div className="shrink-0 w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-200">
              <Pin size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Pinned message
                </span>
                {pinnedForTrack.length > 1 && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    +{pinnedForTrack.length - 1}
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-800 dark:text-slate-100 truncate">
                {primaryPinned?.content?.trim()
                  ? primaryPinned.content.trim()
                  : primaryPinned?.attachments?.length
                    ? "Attachment"
                    : "(no content)"}
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Unpin"
              onClick={(e) => {
                e.stopPropagation();
                if (primaryPinned) pinMessage(primaryPinned.id, false);
              }}
              aria-label="Unpin message"
            >
              <PinOff size={16} />
            </button>
          </div>
        </div>
      )}

      {showPinnedBanner && <div className="shrink-0 h-14" />}

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-dark">
        {messages
          .filter(
            (m) =>
              (m.trackId || tracks[0]?.id || "track-general") ===
                activeTrackId && !m.parentId,
          )
          .map((msg, index, filtered) => {
            const isMe = msg.userId === currentUser.id;
            const user = users.find((u) => u.id === msg.userId);
            const showAvatar =
              index === 0 || filtered[index - 1]?.userId !== msg.userId;

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
              >
                <div className="w-10 shrink-0 flex flex-col items-center">
                  {showAvatar && user ? (
                    <Avatar
                      src={user.avatar}
                      name={user.name}
                      size="lg"
                      status={
                        presence[user.id]?.inHuddleTrackId
                          ? "in-huddle"
                          : presence[user.id]?.status || "offline"
                      }
                      showStatusDot
                    />
                  ) : (
                    <div className="w-10" />
                  )}
                </div>

                <div
                  className={`max-w-[70%] ${
                    isMe ? "items-end" : "items-start"
                  } flex flex-col`}
                >
                  {showAvatar && (
                    <div
                      className={`flex items-baseline gap-2 mb-1 ${
                        isMe ? "flex-row-reverse" : ""
                      }`}
                    >
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {user?.name}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  )}
                  <div className="group relative">
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-tr-none"
                          : "bg-white dark:bg-surface text-slate-800 dark:text-slate-100 rounded-tl-none shadow-sm"
                      }`}
                      onMouseDown={() => {
                        if (longPressTimerRef.current)
                          window.clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = window.setTimeout(() => {
                          setReactionPopoverId(msg.id);
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
                          setReactionPopoverId(msg.id);
                        }, 350);
                      }}
                      onTouchEnd={() => {
                        if (longPressTimerRef.current) {
                          window.clearTimeout(longPressTimerRef.current);
                          longPressTimerRef.current = null;
                        }
                      }}
                    >
                      {renderMessageText(msg.content)}
                      {msg.pinned && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 align-middle">
                          <Pin size={12} /> pinned
                        </span>
                      )}
                    </div>

                    {isMe &&
                      lastOutgoingId === msg.id &&
                      (() => {
                        const seenNames = (msg.readBy || [])
                          .filter((id) => id !== currentUser.id)
                          .map((id) => users.find((u) => u.id === id)?.name)
                          .filter(Boolean) as string[];
                        if (seenNames.length === 0) return null;
                        return (
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 text-right">
                            Seen by {seenNames.join(", ")}
                          </div>
                        );
                      })()}
                    {reactionPopoverId === msg.id && (
                      <div
                        className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white dark:bg-surface rounded-full shadow z-20 px-2 py-1"
                        onMouseLeave={() => setReactionPopoverId(null)}
                      >
                        {reactionQuick.map((e) => (
                          <button
                            key={`quick-${e}`}
                            className="px-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                            onClick={() => {
                              toggleReaction(msg.id, e, currentUser.id);
                              setReactionPopoverId(null);
                            }}
                            title={`React ${e}`}
                          >
                            {e}
                          </button>
                        ))}
                        <button
                          className="ml-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs"
                          onClick={() => {
                            setEmojiPickerId(msg.id);
                            setReactionPopoverId(null);
                          }}
                          title="More"
                        >
                          More
                        </button>
                      </div>
                    )}
                    {Array.isArray(msg.attachments) &&
                      msg.attachments.length > 0 && (
                        <div
                          className={`mt-2 space-y-2 ${
                            isMe ? "items-end" : "items-start"
                          } flex flex-col`}
                        >
                          {msg.attachments.map((att) => {
                            const isImage = att.type.startsWith("image/");
                            const isVideo = att.type.startsWith("video/");
                            const isAudio = att.type.startsWith("audio/");
                            if (isImage) {
                              return (
                                <a
                                  key={att.id}
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="max-h-72 rounded-lg shadow-sm"
                                  />
                                </a>
                              );
                            }
                            if (isVideo) {
                              return (
                                <video
                                  key={att.id}
                                  controls
                                  className="max-h-72 rounded-lg shadow-sm"
                                >
                                  <source src={att.url} type={att.type} />
                                </video>
                              );
                            }
                            if (isAudio) {
                              const id = att.id;
                              const prog = Number.isFinite(audioProgress[id])
                                ? audioProgress[id]
                                : 0;
                              const dur = Number.isFinite(audioDuration[id])
                                ? audioDuration[id]
                                : 0;
                              const pct =
                                dur > 0 ? Math.min(100, (prog / dur) * 100) : 0;
                              const isPlaying = playingAudioId === id;
                              return (
                                <div
                                  key={att.id}
                                  className={`w-80 max-w-full flex items-center gap-3 px-3 py-2 rounded-2xl ${
                                    isMe
                                      ? "bg-indigo-600 text-white"
                                      : "bg-white dark:bg-surface text-slate-800 dark:text-slate-100 shadow-sm"
                                  }`}
                                >
                                  <audio
                                    ref={(el) => {
                                      if (el) audioRefs.current[id] = el;
                                    }}
                                    src={att.url}
                                    preload="metadata"
                                    className="hidden"
                                    onLoadedMetadata={(e) => {
                                      const a = e.currentTarget;
                                      if (
                                        !Number.isFinite(a.duration) ||
                                        a.duration === 0
                                      ) {
                                        const handler = () => {
                                          setAudioDuration((prev) => ({
                                            ...prev,
                                            [id]: a.duration || 0,
                                          }));
                                          a.removeEventListener(
                                            "timeupdate",
                                            handler,
                                          );
                                          try {
                                            a.currentTime = 0;
                                          } catch {}
                                        };
                                        a.addEventListener(
                                          "timeupdate",
                                          handler,
                                        );
                                        try {
                                          a.currentTime = 1e9;
                                        } catch {}
                                      } else {
                                        setAudioDuration((prev) => ({
                                          ...prev,
                                          [id]: a.duration || 0,
                                        }));
                                      }
                                    }}
                                    onTimeUpdate={(e) => {
                                      const a = e.currentTarget;
                                      setAudioProgress((prev) => ({
                                        ...prev,
                                        [id]: a.currentTime || 0,
                                      }));
                                    }}
                                    onEnded={() => {
                                      setPlayingAudioId(null);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    aria-label={isPlaying ? "Pause" : "Play"}
                                    onClick={() => togglePlay(id)}
                                    className={`flex items-center justify-center w-8 h-8 rounded-full border ${
                                      isMe
                                        ? "border-white/50 bg-white/10 hover:bg-white/20"
                                        : "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    }`}
                                  >
                                    {isPlaying ? (
                                      <Pause
                                        size={16}
                                        className={
                                          isMe
                                            ? "text-white"
                                            : "text-slate-700 dark:text-slate-200"
                                        }
                                      />
                                    ) : (
                                      <Play
                                        size={16}
                                        className={
                                          isMe
                                            ? "text-white"
                                            : "text-slate-700 dark:text-slate-200"
                                        }
                                      />
                                    )}
                                  </button>
                                  <div className="flex-1">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        isMe
                                          ? "bg-white/30"
                                          : "bg-slate-200 dark:bg-slate-700"
                                      }`}
                                    >
                                      <div
                                        className={`${
                                          isMe ? "bg-white" : "bg-indigo-600"
                                        } h-1.5 rounded-full transition-[width]`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <div className="mt-1 text-[10px] flex items-center justify-between opacity-80">
                                      <span>{formatMMSS(prog)}</span>
                                      <span>{formatMMSS(dur)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <a
                                key={att.id}
                                href={att.url}
                                download={att.name}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded bg-white dark:bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-sm shadow-sm"
                              >
                                <span className="text-slate-700 dark:text-slate-200 truncate max-w-[220px]">
                                  {att.name}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {(att.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    <div
                      className={`absolute ${
                        isMe
                          ? "left-0 -translate-x-full"
                          : "right-0 translate-x-full"
                      } top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
                    >
                      <button
                        className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="React"
                        onClick={() => setEmojiPickerId(msg.id)}
                      >
                        <Smile size={14} />
                      </button>
                      <button
                        className="p-1 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        title={msg.pinned ? "Unpin message" : "Pin message"}
                        onClick={() => pinMessage(msg.id, !msg.pinned)}
                      >
                        {msg.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </button>
                      {(isAdmin || isMe) && (
                        <button
                          className="p-1 rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                          title="Delete message"
                          onClick={() => setConfirmDeleteMsgId(msg.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {(
                        Object.entries(msg.reactions || {}) as Array<
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
                              key={`chip-${msg.id}-${e}`}
                              className={`px-2 py-1 rounded-full border ${
                                active
                                  ? isMe
                                    ? "bg-white/20 text-white border-white/30"
                                    : "bg-slate-200 text-slate-800 border-slate-300"
                                  : "bg-transparent text-current border-slate-300"
                              }`}
                              onClick={() =>
                                toggleReaction(msg.id, e, currentUser.id)
                              }
                              title={`${e} ${count || ""}`}
                            >
                              {e} {count > 0 ? count : ""}
                            </button>
                          );
                        })}
                      <button
                        className={`
 isMe
 ? "text-white/80 hover:text-white"
 : "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"
 } underline`}
                        onClick={() => setReplyToId(msg.id)}
                      >
                        Reply
                      </button>
                    </div>
                    {reactionPopoverId === msg.id && (
                      <div
                        className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white dark:bg-surface rounded-full shadow z-20 px-2 py-1"
                        onMouseLeave={() => setReactionPopoverId(null)}
                      >
                        {reactionQuick.map((e) => (
                          <button
                            key={`quick-${e}`}
                            className="px-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                            onClick={() => {
                              toggleReaction(msg.id, e, currentUser.id);
                              setReactionPopoverId(null);
                            }}
                            title={`React ${e}`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                    {emojiPickerId === msg.id && (
                      <div
                        className={`absolute ${
                          isMe
                            ? "left-0 -translate-x-full"
                            : "right-0 translate-x-full"
                        } top-0 mt-2 bg-white dark:bg-surface rounded-xl shadow-lg z-20 w-64 max-w-[90vw]`}
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
                                  toggleReaction(msg.id, e, currentUser.id);
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
                  {messages
                    .filter((m) => m.parentId === msg.id)
                    .map((cm) => {
                      const cmMe = cm.userId === currentUser.id;
                      return (
                        <div
                          key={cm.id}
                          className={`mt-2 ml-8 max-w-[70%] ${
                            cmMe ? "items-end" : "items-start"
                          } flex`}
                        >
                          <div
                            className={`px-3 py-2 rounded-2xl text-sm ${
                              cmMe
                                ? "bg-indigo-50 dark:bg-indigo-500/20 text-slate-900 dark:text-slate-100"
                                : "bg-white dark:bg-surface text-slate-800 dark:text-slate-100 shadow-sm"
                            }`}
                          >
                            {renderMessageText(cm.content)}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 md:p-4 bg-white dark:bg-surface shrink-0 shadow-[0_-1px_0_rgba(15,23,42,0.04)] dark:shadow-[0_-1px_0_rgba(255,255,255,0.03)]">
        {pendingFiles.length > 0 && (
          <div className="max-w-4xl mx-auto pb-2">
            <div className="flex gap-3 flex-wrap">
              {pendingFiles.map((f, idx) => {
                const isImage = f.type.startsWith("image/");
                const preview = isImage ? URL.createObjectURL(f) : undefined;
                return (
                  <div
                    key={`${f.name}-${idx}`}
                    className="relative rounded-lg p-2 bg-white dark:bg-dark shadow-sm"
                  >
                    <button
                      className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full w-5 h-5 text-xs"
                      onClick={() =>
                        setPendingFiles((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      type="button"
                      title="Remove"
                    >
                      ×
                    </button>
                    <div className="flex items-center gap-2 max-w-[260px]">
                      {isImage ? (
                        <img
                          src={preview}
                          alt={f.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs">
                          {f.type.startsWith("video/")
                            ? "Video"
                            : f.type.startsWith("audio/")
                              ? "Audio"
                              : "File"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate max-w-[180px] text-slate-900 dark:text-slate-100">
                          {f.name}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {(f.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <form
          onSubmit={
            replyToId
              ? (e) => {
                  e.preventDefault();
                  onSendReplyWrapper();
                }
              : handleSend
          }
          className="relative max-w-4xl mx-auto"
        >
          <input
            type="text"
            value={inputText}
            ref={inputRef}
            onChange={(e) => {
              setInputText(e.target.value);
              if (canPost) {
                setTyping(activeTrackId, currentUser.id, true);
                if (typingTimeoutRef.current)
                  window.clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = window.setTimeout(() => {
                  setTyping(activeTrackId, currentUser.id, false);
                  typingTimeoutRef.current = null;
                }, 2000);
              }
              updateMentionContext(e.target.value, e.target.selectionStart);
            }}
            placeholder={`${replyToId ? "Reply in thread" : "Message"} #${
              tracks.find((t) => t.id === activeTrackId)?.name || "general-team"
            }...`}
            className="w-full pl-4 pr-24 py-3 bg-slate-100 dark:bg-dark border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-dark transition-all outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            disabled={!canPost}
            onBlur={() => {
              setTyping(activeTrackId, currentUser.id, false);
              if (typingTimeoutRef.current)
                window.clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = null;
            }}
            onKeyDown={(e) => {
              if (!mentionOpen || mentionItems.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex((i) => (i + 1) % mentionItems.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex(
                  (i) => (i - 1 + mentionItems.length) % mentionItems.length,
                );
              } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(mentionItems[mentionIndex]);
              } else if (e.key === "Escape") {
                setMentionOpen(false);
              }
            }}
          />
          {mentionOpen && mentionItems.length > 0 && (
            <div className="absolute left-0 right-24 bottom-full mb-2 bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl z-20 max-h-64 overflow-auto backdrop-blur-sm">
              <ul className="py-1">
                {mentionItems.map((it, idx) => (
                  <li key={`${it.kind}-${it.id}-${idx}`}>
                    <button
                      type="button"
                      className={`w-full px-3 py-2 flex items-center gap-2 text-sm ${
                        idx === mentionIndex
                          ? "bg-indigo-50 dark:bg-indigo-500/20"
                          : ""
                      }`}
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        insertMention(it);
                      }}
                    >
                      {it.kind === "user" ? (
                        <Avatar src={it.avatar} name={it.label} size="sm" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-200 flex items-center justify-center">
                          <Hash size={14} />
                        </div>
                      )}
                      <span className="text-slate-800 dark:text-slate-100">
                        {it.label}
                      </span>
                      <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                        {it.sublabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="absolute right-12 top-2 flex items-center gap-1.5">
            <button
              type="button"
              className={`p-1.5 rounded-lg border border-transparent ${
                isRecording
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={() => (isRecording ? stopRecording() : startRecording())}
              title={isRecording ? "Stop recording" : "Start recording"}
              disabled={!canPost}
            >
              {isRecording ? <Square size={18} /> : <Mic size={18} />}
            </button>
            {isRecording && (
              <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                Recording {String(Math.floor(recSeconds / 60)).padStart(2, "0")}
                :{String(recSeconds % 60).padStart(2, "0")}
              </span>
            )}
            <button
              type="button"
              className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,video/*,.pdf,.zip,.rar,.7z,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []) as File[];
                if (files.length === 0) return;
                const filtered = files.filter(
                  (f) => f.size <= 20 * 1024 * 1024,
                );
                setPendingFiles((prev) => [...prev, ...filtered]);
                e.currentTarget.value = "";
              }}
            />
          </div>
          <button
            type="submit"
            disabled={
              (!inputText.trim() && pendingFiles.length === 0) || !canPost
            }
            className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            {isUploading ? (
              <span className="text-xs px-1">…</span>
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>
        {replyToId && (
          <div className="relative max-w-4xl mx-auto mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Replying in thread
            <button
              className="ml-2 underline"
              onClick={() => setReplyToId(null)}
            >
              Cancel
            </button>
          </div>
        )}
        <p className="max-w-4xl mx-auto text-[11px] text-slate-400 dark:text-slate-500 mt-1">
          Type @ to mention a person or track · Enter to send · Shift+Enter for
          a new line
        </p>
        {typingOthers.length > 0 && (
          <p className="max-w-4xl mx-auto text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {typingOthers.join(", ")} {typingOthers.length > 1 ? "are" : "is"}{" "}
            typing…
          </p>
        )}
        {!canPost && (
          <p className="text-center text-xs text-slate-500 mt-2">
            You're not a member of this track. Ask an admin to add you.
          </p>
        )}
      </div>
      {confirmDeleteMsgId && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete message"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmDeleteMsgId(null)}
          />
          <div className="relative bg-white dark:bg-surface rounded-lg shadow-lg w-[90%] max-w-md p-5 z-50">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Delete message?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              This will permanently remove the message. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => setConfirmDeleteMsgId(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  const id = confirmDeleteMsgId;
                  setConfirmDeleteMsgId(null);
                  if (!id) return;
                  deleteMessage(id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
