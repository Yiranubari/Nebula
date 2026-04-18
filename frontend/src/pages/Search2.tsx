import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Message, Task, Attachment } from "../types";
import {
  Search as SearchIcon,
  Filter,
  File as FileIcon,
  MessageSquare,
  ListChecks,
} from "lucide-react";
import Spinner from "../components/Spinner";
import {
  isProbablySlowNetwork,
  runWithDelayedSpinner,
  sleep,
} from "../services/uiLoading";

type Category = "All" | "Messages" | "Tasks" | "Files";

function normalize(text?: string) {
  return (text || "").toLowerCase();
}

function matches(text: string, q: string) {
  return normalize(text).includes(normalize(q));
}

function formatDateTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso || "";
  }
}

export default function SearchPage() {
  const navigate = useNavigate();
  const { tracks, messages, tasks, users } = useApp();
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);

  const runSearch = async () => {
    if (isSearching) return;
    await runWithDelayedSpinner({
      setLoading: setIsSearching,
      fn: async () => {
        // In this demo app the search is local, but this keeps the UX correct
        // when the app later switches to server-backed search.
        if (isProbablySlowNetwork()) {
          await sleep(650);
        }
        setQuery(draftQuery);
      },
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim();

    // Don't show "pre-searched" results. Require a non-empty query.
    if (!q) {
      return { messageResults: [], fileResults: [], taskResults: [] };
    }

    const trackId = trackFilter === "all" ? null : trackFilter;
    const fromTs = fromDate ? new Date(fromDate).getTime() : null;
    const toTs = toDate ? new Date(toDate).getTime() : null;

    const messageResults: Array<{ item: Message; kind: "message" }> = [];
    const fileResults: Array<{
      item: Attachment;
      message: Message;
      kind: "file";
    }> = [];
    const taskResults: Array<{ item: Task; kind: "task" }> = [];

    for (const m of messages) {
      if (trackId && m.trackId !== trackId) continue;

      const mt = m.timestamp ? new Date(m.timestamp).getTime() : null;
      if (fromTs && mt && mt < fromTs) continue;
      if (toTs && mt && mt > toTs) continue;

      const contentHit = matches(m.content || "", q);
      const author = users.find((u) => u.id === m.userId);
      const authorHit = matches(author?.name || "", q);

      const attachments: Attachment[] = (m.attachments || []) as Attachment[];
      const anyAttachmentHit = attachments.some((a) =>
        matches(a.name || a.type || "", q)
      );

      if (contentHit || authorHit || anyAttachmentHit) {
        messageResults.push({ item: m, kind: "message" });
      }

      for (const a of attachments) {
        if (fromTs && mt && mt < fromTs) continue;
        if (toTs && mt && mt > toTs) continue;
        if (matches(a.name || a.type || "", q)) {
          fileResults.push({ item: a, message: m, kind: "file" });
        }
      }
    }

    for (const t of tasks) {
      const ct = t.createdAt ? new Date(t.createdAt).getTime() : null;
      const dt = t.dueDate ? new Date(t.dueDate).getTime() : null;
      const labelText = (t.labels || []).join(" ");
      const fields = [
        t.title || "",
        t.description || "",
        labelText,
        t.status || "",
        t.assigneeId || "",
      ].join(" ");
      const dateInRange = (() => {
        if (fromTs && ct && ct < fromTs && (!dt || dt < fromTs)) return false;
        if (toTs && ct && ct > toTs && (!dt || dt > toTs)) return false;
        return true;
      })();
      if (matches(fields, q) && dateInRange) {
        taskResults.push({ item: t, kind: "task" });
      }
    }

    messageResults.sort(
      (a, b) =>
        (new Date(b.item.timestamp || 0).getTime() || 0) -
        (new Date(a.item.timestamp || 0).getTime() || 0)
    );
    fileResults.sort(
      (a, b) =>
        (new Date(b.message.timestamp || 0).getTime() || 0) -
        (new Date(a.message.timestamp || 0).getTime() || 0)
    );
    taskResults.sort(
      (a, b) =>
        (new Date(b.item.createdAt || 0).getTime() || 0) -
        (new Date(a.item.createdAt || 0).getTime() || 0)
    );

    return { messageResults, fileResults, taskResults };
  }, [query, category, trackFilter, messages, tasks, users, fromDate, toDate]);

  const onOpenMessage = (m: Message) => {
    const trackId = m.trackId || tracks[0]?.id || "track-general";
    navigate(
      `/chat?trackId=${encodeURIComponent(
        trackId
      )}&messageId=${encodeURIComponent(m.id)}`
    );
  };

  const onOpenTask = (t: Task) => {
    navigate(`/tasks?taskId=${encodeURIComponent(t.id)}`);
  };

  const onOpenFile = (msg: Message) => {
    const trackId = msg.trackId || tracks[0]?.id || "track-general";
    navigate(
      `/chat?trackId=${encodeURIComponent(
        trackId
      )}&messageId=${encodeURIComponent(msg.id)}#attachments`
    );
  };

  const { messageResults, fileResults, taskResults } = filtered;

  const showMessages = category === "All" || category === "Messages";
  const showFiles = category === "All" || category === "Files";
  const showTasks = category === "All" || category === "Tasks";

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand">
          Search
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Find messages, files, and tasks across your workspace.
        </p>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1 border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm rounded-lg px-3 py-2">
          <SearchIcon
            size={18}
            className="text-slate-500 dark:text-slate-400"
          />
          <input
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder="Search messages, tasks, files"
            className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={isSearching}
            aria-busy={isSearching}
            className={`ml-1 inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 ${
              isSearching ? "opacity-80 cursor-not-allowed" : ""
            }`}
          >
            {isSearching ? (
              <Spinner
                size={16}
                className="text-white"
                aria-label="Searching"
              />
            ) : (
              <SearchIcon size={16} className="text-white" />
            )}
            Search
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-500 dark:text-slate-400" />
          <div className="flex rounded-lg border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm overflow-hidden">
            {(["All", "Messages", "Files", "Tasks"] as Category[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-2 text-xs md:text-sm ${
                  category === c
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm text-slate-900 dark:text-slate-100"
          >
            <option value="all">All Tracks</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 dark:text-slate-300">
            From
          </label>
          <input
            type="datetime-local"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 dark:text-slate-300">
            To
          </label>
          <input
            type="datetime-local"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {showMessages && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare
                size={18}
                className="text-slate-600 dark:text-slate-300"
              />
              <strong className="text-slate-800 dark:text-slate-100">
                Messages ({messageResults.length})
              </strong>
            </div>
            <div className="grid gap-3">
              {messageResults.map(({ item }) => {
                const track = tracks.find((t) => t.id === item.trackId);
                const author = users.find((u) => u.id === item.userId);
                return (
                  <div
                    key={item.id}
                    className="border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm rounded-lg p-3"
                  >
                    <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">
                      {track ? `#${track.name}` : "#unknown"} ·{" "}
                      {author?.name || "Unknown"} ·{" "}
                      {formatDateTime(item.timestamp)}
                    </div>
                    <div className="text-sm text-slate-800 dark:text-slate-100">
                      {item.content}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => onOpenMessage(item)}
                        className="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                );
              })}
              {messageResults.length === 0 && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  No messages found.
                </div>
              )}
            </div>
          </section>
        )}

        {showFiles && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <FileIcon
                size={18}
                className="text-slate-600 dark:text-slate-300"
              />
              <strong className="text-slate-800 dark:text-slate-100">
                Files ({fileResults.length})
              </strong>
            </div>
            <div className="grid gap-3">
              {fileResults.map(({ item, message }) => {
                const track = tracks.find((t) => t.id === message.trackId);
                return (
                  <div
                    key={`${message.id}-${item.name}-${item.type}-${
                      item.size || 0
                    }`}
                    className="border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm rounded-lg p-3"
                  >
                    <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">
                      {track ? `#${track.name}` : "#unknown"} ·{" "}
                      {formatDateTime(message.timestamp)}
                    </div>
                    <div className="text-sm text-slate-800 dark:text-slate-100">
                      {item.name || item.type || "Attachment"}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => onOpenFile(message)}
                        className="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                );
              })}
              {fileResults.length === 0 && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  No files found.
                </div>
              )}
            </div>
          </section>
        )}

        {showTasks && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <ListChecks
                size={18}
                className="text-slate-600 dark:text-slate-300"
              />
              <strong className="text-slate-800 dark:text-slate-100">
                Tasks ({taskResults.length})
              </strong>
            </div>
            <div className="grid gap-3">
              {taskResults.map(({ item }) => (
                <div
                  key={item.id}
                  className="border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm rounded-lg p-3"
                >
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Created: {formatDateTime(item.createdAt)}
                    {item.dueDate
                      ? ` · Due: ${formatDateTime(item.dueDate)}`
                      : ""}
                  </div>
                  {item.labels && item.labels.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {item.labels.map((l) => (
                        <span
                          key={l}
                          className="text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 text-slate-700 dark:text-slate-200"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => onOpenTask(item)}
                      className="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
              {taskResults.length === 0 && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  No tasks found.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
