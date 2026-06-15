import React, { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { Task, TaskStatus, Priority } from "../types";
import {
  MoreHorizontal,
  Calendar,
  Clock,
  ArrowRight,
  X,
  Flag,
  Tag,
} from "lucide-react";
import Avatar from "../components/Avatar";
import Select from "../components/Select";

const TaskBoard = () => {
  const {
    tasks,
    users,
    updateTaskStatus,
    deleteTask,
    addTask,
    currentUser,
    updateTask,
    notifications,
    approveTask,
    rejectTask,
    requestTaskApproval,
    addTaskReminder,
  } = useApp();
  const { presence } = useApp();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  const [lastDeletedTask, setLastDeletedTask] = useState<Task | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<number | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmSubmitTaskId, setConfirmSubmitTaskId] = useState<string | null>(
    null,
  );
  const [confirmApproveTaskId, setConfirmApproveTaskId] = useState<
    string | null
  >(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | TaskStatus>("ALL");
  const [filterAssignee, setFilterAssignee] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<"ALL" | Priority>("ALL");
  const [sortBy, setSortBy] = useState<
    "createdAt" | "priority" | "estimatedHours"
  >("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredSortedTasks = useMemo(() => {
    const matchesFilters = (t: Task) => {
      const q = search.trim().toLowerCase();
      const matchText =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      const matchAssignee =
        filterAssignee === "ALL" || t.assigneeId === filterAssignee;
      const matchPriority =
        filterPriority === "ALL" || t.priority === filterPriority;
      return matchText && matchAssignee && matchPriority;
    };
    const arr = tasks.filter(matchesFilters);
    const cmp = (a: Task, b: Task) => {
      let va = 0;
      let vb = 0;
      if (sortBy === "createdAt") {
        va = Number.isFinite(Date.parse(a.createdAt))
          ? Date.parse(a.createdAt)
          : 0;
        vb = Number.isFinite(Date.parse(b.createdAt))
          ? Date.parse(b.createdAt)
          : 0;
      } else if (sortBy === "estimatedHours") {
        va = Number(a.estimatedHours ?? 0);
        vb = Number(b.estimatedHours ?? 0);
      } else {
        const order: Record<Priority, number> = {
          [Priority.CRITICAL]: 4,
          [Priority.HIGH]: 3,
          [Priority.MEDIUM]: 2,
          [Priority.LOW]: 1,
        };
        va = order[a.priority] ?? 0;
        vb = order[b.priority] ?? 0;
      }
      const res = va < vb ? -1 : va > vb ? 1 : 0;
      return sortOrder === "asc" ? res : -res;
    };
    return arr.slice().sort(cmp);
  }, [tasks, search, filterAssignee, filterPriority, sortBy, sortOrder]);

  const columns = [
    { id: TaskStatus.TODO, title: "To Do", color: "bg-slate-500" },
    { id: TaskStatus.IN_PROGRESS, title: "In Progress", color: "bg-blue-500" },
    { id: TaskStatus.REVIEW, title: "Review", color: "bg-amber-500" },
    { id: TaskStatus.DONE, title: "Done", color: "bg-green-500" },
  ];

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case Priority.CRITICAL:
        return "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/15";
      case Priority.HIGH:
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/15";
      case Priority.MEDIUM:
        return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/15";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/15";
    }
  };

  const nextStatusMap: Record<TaskStatus, TaskStatus | null> = {
    [TaskStatus.TODO]: TaskStatus.IN_PROGRESS,
    [TaskStatus.IN_PROGRESS]: TaskStatus.REVIEW,
    [TaskStatus.REVIEW]: TaskStatus.DONE,
    [TaskStatus.DONE]: null,
  };

  return (
    <>
      <div className="p-4 md:p-8 min-h-[calc(100vh-3.5rem)] md:min-h-screen overflow-hidden flex flex-col">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-brand">
              Task Board
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Drag, filter, and ship — your team's work at a glance.
            </p>
          </div>
          <div className="flex-1 md:flex md:items-center md:justify-end">
            <div className="flex flex-wrap gap-2 items-center">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="px-3 py-2 bg-white/50 dark:bg-white/[0.03] backdrop-blur-sm rounded-xl focus:outline-none focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/10 text-sm w-full sm:w-56 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <Select<"ALL" | TaskStatus>
                value={filterStatus}
                onChange={setFilterStatus}
                ariaLabel="Filter by status"
                options={[
                  { value: "ALL", label: "All Statuses" },
                  ...Object.values(TaskStatus).map((s) => ({
                    value: s as TaskStatus,
                    label: s,
                  })),
                ]}
              />
              <Select<string>
                value={filterAssignee}
                onChange={setFilterAssignee}
                ariaLabel="Filter by assignee"
                options={[
                  { value: "ALL", label: "All Assignees" },
                  ...users.map((u) => ({
                    value: u.id,
                    label: u.name.split(" ")[0],
                  })),
                ]}
              />
              <Select<"ALL" | Priority>
                value={filterPriority}
                onChange={setFilterPriority}
                ariaLabel="Filter by priority"
                options={[
                  { value: "ALL", label: "All Priorities" },
                  ...Object.values(Priority).map((p) => ({
                    value: p as Priority,
                    label: p,
                  })),
                ]}
              />
              <Select<"createdAt" | "priority" | "estimatedHours">
                value={sortBy}
                onChange={setSortBy}
                ariaLabel="Sort by"
                options={[
                  { value: "createdAt", label: "Sort: Created" },
                  { value: "priority", label: "Sort: Priority" },
                  { value: "estimatedHours", label: "Sort: Hours" },
                ]}
              />
              <Select<"asc" | "desc">
                value={sortOrder}
                onChange={setSortOrder}
                ariaLabel="Sort order"
                options={[
                  { value: "desc", label: "Desc" },
                  { value: "asc", label: "Asc" },
                ]}
              />
            </div>
          </div>
        </div>

        {currentUser.role === "ADMIN" &&
          notifications.filter((n) => n.status === "PENDING").length > 0 && (
            <div className="mb-4 bg-amber-500/5 dark:bg-amber-500/[0.08] backdrop-blur-sm border border-amber-400/15 dark:border-amber-400/20 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending approvals
              </h2>
              <div className="space-y-2">
                {notifications
                  .filter((n) => n.status === "PENDING")
                  .map((n) => {
                    const task = tasks.find((t) => t.id === n.taskId);
                    const requester = users.find((u) => u.id === n.requesterId);
                    if (!task) return null;
                    return (
                      <div
                        key={n.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="text-slate-700 dark:text-slate-200">
                          {task.title}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">
                          •
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          Requested by {requester?.name || "Unknown"}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm shadow-emerald-500/20 transition-colors"
                            onClick={() => {
                              approveTask(n.taskId).catch(() => {});
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs shadow-sm shadow-rose-500/20 transition-colors"
                            onClick={() => {
                              rejectTask(n.taskId).catch(() => {});
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        <div className="flex-1 flex gap-4 md:gap-6 overflow-x-auto pb-4">
          {(filterStatus === "ALL"
            ? columns
            : columns.filter((c) => c.id === filterStatus)
          ).map((col) => (
            <div
              key={col.id}
              className="min-w-[260px] sm:min-w-[280px] md:min-w-[320px] max-w-[320px] flex flex-col h-full glass-panel rounded-2xl"
            >
              <div className="p-4 flex justify-between items-center sticky top-0 backdrop-blur-xl rounded-t-2xl z-10 bg-white/30 dark:bg-white/[0.015]">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <h3 className="font-medium text-slate-700 dark:text-slate-200 tracking-tight">
                    {col.title}
                  </h3>
                  <span className="bg-slate-100/70 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">
                    {tasks.filter((t) => t.status === col.id).length}
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {filteredSortedTasks
                  .filter((t) => t.status === col.id)
                  .map((task) => {
                    const assignee = users.find(
                      (u) => u.id === task.assigneeId,
                    );
                    const nextStatus = nextStatusMap[task.status];
                    const canAdvance =
                      currentUser.role === "ADMIN" ||
                      task.assigneeId === currentUser.id;

                    return (
                      <div
                        key={task.id}
                        className="soft-surface p-4 rounded-2xl cursor-pointer transition-all group relative hover:-translate-y-0.5"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setMenuOpenId(null);
                          setDetailTask(task);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setMenuOpenId(null);
                            setDetailTask(task);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityColor(
                              task.priority,
                            )}`}
                          >
                            {task.priority}
                          </span>
                          {currentUser.role === "ADMIN" && (
                            <button
                              className="text-slate-400 hover:text-slate-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(
                                  menuOpenId === task.id ? null : task.id,
                                );
                              }}
                              aria-haspopup="menu"
                              aria-expanded={menuOpenId === task.id}
                              aria-controls={`task-menu-${task.id}`}
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          )}
                        </div>

                        {currentUser.role === "ADMIN" &&
                          menuOpenId === task.id && (
                            <div
                              id={`task-menu-${task.id}`}
                              role="menu"
                              className="absolute right-2 top-8 z-20 bg-white dark:bg-[#0f172a] rounded-xl shadow-lg w-36 py-1 backdrop-blur-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                role="menuitem"
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                onClick={() => {
                                  setEditTask(task);
                                  setMenuOpenId(null);
                                }}
                              >
                                Edit Task
                              </button>
                              <button
                                role="menuitem"
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setConfirmTask(task);
                                  setMenuOpenId(null);
                                }}
                              >
                                Delete Task
                              </button>
                            </div>
                          )}

                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 leading-tight">
                          {task.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                          {task.description}
                        </p>
                        {task.labels && task.labels.length > 0 && (
                          <div className="mt-1 flex gap-1 flex-wrap">
                            {task.labels.slice(0, 3).map((l, i) => (
                              <span
                                key={`${task.id}-label-${i}`}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 max-w-[140px] truncate"
                                title={l}
                              >
                                {l}
                              </span>
                            ))}
                            {task.labels.length > 3 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400">
                                +{task.labels.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar size={12} />
                            <span>
                              Due {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between pt-3 ">
                          <div className="flex items-center gap-2">
                            {assignee ? (
                              <>
                                <Avatar
                                  src={assignee.avatar}
                                  name={assignee.name}
                                  size="sm"
                                  title={assignee.name}
                                  status={
                                    presence[assignee.id]?.inHuddleTrackId
                                      ? "in-huddle"
                                      : presence[assignee.id]?.status ||
                                        "offline"
                                  }
                                  showStatusDot
                                />
                                {presence[assignee.id]?.inHuddleTrackId && (
                                  <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-violet-50 text-violet-700 border border-violet-200">
                                    In huddle
                                  </span>
                                )}
                              </>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                                ?
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock size={12} />
                              <span>{task.estimatedHours}h</span>
                            </div>
                          </div>

                          {nextStatus &&
                            canAdvance &&
                            (task.status === TaskStatus.REVIEW ? (
                              currentUser.role !== "ADMIN" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmSubmitTaskId(task.id);
                                  }}
                                  className="text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/15 px-2.5 py-1 rounded-full transition-colors opacity-0 group-hover:opacity-100 text-xs"
                                  title={`Submit for approval`}
                                >
                                  Submit
                                </button>
                              )
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTaskStatus(task.id, nextStatus).catch(
                                    () => {},
                                  );
                                }}
                                className="text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/10 p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                title={`Move to ${nextStatus}`}
                              >
                                <ArrowRight size={16} />
                              </button>
                            ))}
                          <button
                            className="ml-2 text-xs px-2.5 py-1 rounded-full bg-slate-500/5 hover:bg-slate-500/10 text-slate-600 dark:text-slate-300 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              addTaskReminder(task.id);
                              toast.success("Reminder queued.");
                            }}
                            title="Remind me/assignee"
                          >
                            Remind
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {tasks.filter((t) => t.status === col.id).length === 0 && (
                  <div className="h-24 border border-dashed border-slate-200/40 dark:border-white/[0.05] rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs px-3 text-center">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      Nothing here yet
                    </span>
                    {col.id === TaskStatus.TODO &&
                    currentUser.role === "ADMIN" ? (
                      <span className="mt-0.5">
                        Create one from the Admin panel.
                      </span>
                    ) : (
                      <span className="mt-0.5">
                        Tasks in this stage will appear here.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {confirmTask && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete task"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmTask(null)}
          />
          <div className="relative bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl w-[90%] max-w-md p-6 z-50">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Delete task?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              This action will remove "{confirmTask.title}". You can undo right
              after deletion.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 dark:hover:bg-white/[0.05] transition-colors"
                onClick={() => setConfirmTask(null)}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20 transition-colors"
                onClick={async () => {
                  const t = confirmTask;
                  setConfirmTask(null);
                  if (!t) return;
                  try {
                    await deleteTask(t.id);
                    setLastDeletedTask(t);
                    setShowUndo(true);
                    if (undoTimerRef.current)
                      window.clearTimeout(undoTimerRef.current);
                    undoTimerRef.current = window.setTimeout(() => {
                      setShowUndo(false);
                      setLastDeletedTask(null);
                      undoTimerRef.current = null;
                    }, 5000);
                  } catch {
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editTask && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Edit task"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditTask(null)}
          />
          <div className="relative bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl w-[95%] max-w-lg p-6 z-50">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Edit Task
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Title
                </label>
                <input
                  className="px-3 py-2.5 bg-slate-50/70 dark:bg-white/[0.03] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/10"
                  value={editTask.title}
                  onChange={(e) =>
                    setEditTask({ ...editTask, title: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Assignee
                </label>
                <Select<string>
                  value={editTask.assigneeId || ""}
                  onChange={(v) =>
                    setEditTask({ ...editTask, assigneeId: v })
                  }
                  className="w-full justify-between"
                  ariaLabel="Assignee"
                  options={users.map((u) => ({ value: u.id, label: u.name }))}
                />
              </div>
              <div className="md:col-span-2 flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Description
                </label>
                <textarea
                  className="px-3 py-2.5 bg-slate-50/70 dark:bg-white/[0.03] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/10"
                  rows={4}
                  value={editTask.description}
                  onChange={(e) =>
                    setEditTask({ ...editTask, description: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  min={1}
                  className="px-3 py-2.5 bg-slate-50/70 dark:bg-white/[0.03] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/10"
                  value={editTask.estimatedHours}
                  onChange={(e) =>
                    setEditTask({
                      ...editTask,
                      estimatedHours: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Priority
                </label>
                <Select<Priority>
                  value={editTask.priority}
                  onChange={(v) => setEditTask({ ...editTask, priority: v })}
                  className="w-full justify-between"
                  ariaLabel="Priority"
                  options={Object.values(Priority).map((p) => ({
                    value: p,
                    label: p,
                  }))}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Status
                </label>
                <Select<TaskStatus>
                  value={editTask.status}
                  onChange={(v) => setEditTask({ ...editTask, status: v })}
                  className="w-full justify-between"
                  ariaLabel="Status"
                  options={Object.values(TaskStatus).map((s) => ({
                    value: s,
                    label: s,
                  }))}
                />
              </div>
            </div>
            {editError && (
              <p className="mt-3 text-sm text-red-500">{editError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 dark:hover:bg-white/[0.05] transition-colors"
                onClick={() => {
                  setEditTask(null);
                  setEditError(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
                disabled={isSavingEdit}
                onClick={async () => {
                  if (!editTask) return;
                  if (!editTask.title.trim()) {
                    setEditError("Please enter a title.");
                    return;
                  }
                  if (!editTask.description.trim()) {
                    setEditError("Please enter a description.");
                    return;
                  }
                  if (!editTask.assigneeId) {
                    setEditError("Please select an assignee.");
                    return;
                  }
                  if (editTask.estimatedHours <= 0) {
                    setEditError("Estimated hours must be positive.");
                    return;
                  }
                  setEditError(null);
                  setIsSavingEdit(true);
                  try {
                    await updateTask(editTask);
                    setEditTask(null);
                  } catch {
                  } finally {
                    setIsSavingEdit(false);
                  }
                }}
              >
                {isSavingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSubmitTaskId && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm submit for approval"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmSubmitTaskId(null)}
          />
          <div className="relative bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl w-[90%] max-w-md p-6 z-50">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Submit for approval?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              An admin will be notified to review this task before it can be
              marked Done.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 dark:hover:bg-white/[0.05] transition-colors"
                onClick={() => setConfirmSubmitTaskId(null)}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-colors"
                onClick={() => {
                  const id = confirmSubmitTaskId;
                  setConfirmSubmitTaskId(null);
                  if (!id) return;
                  requestTaskApproval(id);
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmApproveTaskId && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm approve task"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmApproveTaskId(null)}
          />
          <div className="relative bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl w-[90%] max-w-md p-6 z-50">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Approve this task?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Moves the task to Done and closes the approval request.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 dark:hover:bg-white/[0.05] transition-colors"
                onClick={() => setConfirmApproveTaskId(null)}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 transition-colors"
                onClick={() => {
                  const id = confirmApproveTaskId;
                  setConfirmApproveTaskId(null);
                  if (!id) return;
                  approveTask(id).catch(() => {});
                }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
      {detailTask &&
        (() => {
          const assignee = users.find((u) => u.id === detailTask.assigneeId);
          const statusLabel =
            columns.find((c) => c.id === detailTask.status)?.title ||
            detailTask.status;
          return (
            <div
              className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Task details"
            >
              <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={() => setDetailTask(null)}
              />
              <div className="relative bg-white dark:bg-[#0f172a] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:w-[95%] sm:max-w-2xl max-h-[90vh] flex flex-col z-50 overflow-hidden">
                <div className="relative p-6 pb-4 ">
                  <button
                    className="absolute top-4 right-4 p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-500/10 dark:hover:bg-white/[0.05] transition-colors"
                    onClick={() => setDetailTask(null)}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                  <div className="flex items-center gap-2 flex-wrap mb-3 pr-10">
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getPriorityColor(
                        detailTask.priority,
                      )}`}
                    >
                      {detailTask.priority}
                    </span>
                    <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      {statusLabel}
                    </span>
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-50 break-words leading-tight">
                    {detailTask.title}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                  {detailTask.description && (
                    <section>
                      <h3 className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 font-medium mb-2">
                        Description
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                        {detailTask.description}
                      </p>
                    </section>
                  )}

                  {detailTask.labels && detailTask.labels.length > 0 && (
                    <section>
                      <h3 className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 font-medium mb-2 flex items-center gap-1.5">
                        <Tag size={12} /> Labels
                      </h3>
                      <div className="flex gap-1.5 flex-wrap">
                        {detailTask.labels.map((l, i) => (
                          <span
                            key={`detail-label-${i}`}
                            className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 break-all"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 font-medium mb-2">
                        Assignee
                      </h3>
                      {assignee ? (
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={assignee.avatar}
                            name={assignee.name}
                            size="md"
                            status={
                              presence[assignee.id]?.inHuddleTrackId
                                ? "in-huddle"
                                : presence[assignee.id]?.status || "offline"
                            }
                            showStatusDot
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                              {assignee.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {assignee.email}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Unassigned
                        </p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 font-medium mb-2 flex items-center gap-1.5">
                        <Flag size={12} /> Metadata
                      </h3>
                      <dl className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Clock size={13} className="text-slate-400" />
                          <span className="font-light">
                            {detailTask.estimatedHours}h estimated
                          </span>
                        </div>
                        {detailTask.dueDate && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <Calendar size={13} className="text-slate-400" />
                            <span className="font-light">
                              Due{" "}
                              {new Date(
                                detailTask.dueDate,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {detailTask.createdAt && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <Calendar size={13} className="text-slate-400" />
                            <span className="font-light">
                              Created{" "}
                              {new Date(
                                detailTask.createdAt,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 pt-1">
                          <span className="text-[11px] font-mono break-all">
                            #{detailTask.id}
                          </span>
                        </div>
                      </dl>
                    </div>
                  </section>
                </div>

                <div className="px-6 py-4 flex flex-wrap items-center justify-end gap-2 bg-slate-50/50 dark:bg-white/[0.01]">
                  <button
                    className="px-4 py-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 dark:hover:bg-white/[0.05] transition-colors text-sm"
                    onClick={() => {
                      addTaskReminder(detailTask.id);
                      toast.success("Reminder queued.");
                    }}
                  >
                    Remind
                  </button>
                  {currentUser.role === "ADMIN" && (
                    <button
                      className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm shadow-sm shadow-indigo-500/20 transition-colors"
                      onClick={() => {
                        setEditTask(detailTask);
                        setDetailTask(null);
                      }}
                    >
                      Edit Task
                    </button>
                  )}
                  <button
                    className="px-4 py-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 dark:hover:bg-white/[0.05] transition-colors text-sm"
                    onClick={() => setDetailTask(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {showUndo && lastDeletedTask && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 z-50">
          <div className="bg-white dark:bg-[#0f172a] shadow-lg rounded-2xl px-4 py-3 flex items-center gap-3 backdrop-blur-sm">
            <span className="text-sm text-slate-700 dark:text-slate-200">
              Task deleted.
            </span>
            <button
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              onClick={() => {
                if (undoTimerRef.current) {
                  window.clearTimeout(undoTimerRef.current);
                  undoTimerRef.current = null;
                }
                addTask(lastDeletedTask).catch(() => {});
                setShowUndo(false);
                setLastDeletedTask(null);
              }}
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskBoard;
