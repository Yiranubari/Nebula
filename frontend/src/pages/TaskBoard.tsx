import React, { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { Task, TaskStatus, Priority } from "../types";
import { MoreHorizontal, Calendar, Clock, ArrowRight } from "lucide-react";
import Avatar from "../components/Avatar";

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
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  const [lastDeletedTask, setLastDeletedTask] = useState<Task | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<number | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmSubmitTaskId, setConfirmSubmitTaskId] = useState<string | null>(
    null
  );
  const [confirmApproveTaskId, setConfirmApproveTaskId] = useState<
    string | null
  >(null);

  // Filters / Search / Sort
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
        return "bg-red-100 text-red-700 border-red-200";
      case Priority.HIGH:
        return "bg-orange-100 text-orange-700 border-orange-200";
      case Priority.MEDIUM:
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Task Board
          </h1>
          <div className="flex-1 md:flex md:items-center md:justify-end">
            <div className="flex flex-wrap gap-2 items-center">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="px-3 py-2 bg-white dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full sm:w-56 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as any as "ALL" | TaskStatus)
                }
                className="px-3 py-2 bg-white dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full sm:w-auto text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">All Statuses</option>
                {Object.values(TaskStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full sm:w-auto text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">All Assignees</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name.split(" ")[0]}
                  </option>
                ))}
              </select>
              <select
                value={filterPriority}
                onChange={(e) =>
                  setFilterPriority(e.target.value as any as "ALL" | Priority)
                }
                className="px-3 py-2 bg-white dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full sm:w-auto text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">All Priorities</option>
                {Object.values(Priority).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as any as
                      | "createdAt"
                      | "priority"
                      | "estimatedHours"
                  )
                }
                className="px-3 py-2 bg-white dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full sm:w-auto text-slate-900 dark:text-slate-100"
              >
                <option value="createdAt">Sort: Created</option>
                <option value="priority">Sort: Priority</option>
                <option value="estimatedHours">Sort: Hours</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value as any as "asc" | "desc")
                }
                className="px-3 py-2 bg-white dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full sm:w-auto text-slate-900 dark:text-slate-100"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>
        </div>

        {currentUser.role === "ADMIN" &&
          notifications.filter((n) => n.status === "PENDING").length > 0 && (
            <div className="mb-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
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
                            className="px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                            onClick={() => {
                              approveTask(n.taskId).catch(() => {});
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
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
              className="min-w-[260px] sm:min-w-[280px] md:min-w-[320px] max-w-[320px] flex flex-col h-full bg-slate-50 dark:bg-surface rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-slate-50 dark:bg-surface rounded-t-xl z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                    {col.title}
                  </h3>
                  <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-200 text-xs px-2 py-0.5 rounded-full">
                    {tasks.filter((t) => t.status === col.id).length}
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {filteredSortedTasks
                  .filter((t) => t.status === col.id)
                  .map((task) => {
                    const assignee = users.find(
                      (u) => u.id === task.assigneeId
                    );
                    const nextStatus = nextStatusMap[task.status];
                    const canAdvance =
                      currentUser.role === "ADMIN" ||
                      task.assigneeId === currentUser.id;

                    return (
                      <div
                        key={task.id}
                        className="bg-white dark:bg-dark p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow group relative"
                        onClick={() => setMenuOpenId(null)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityColor(
                              task.priority
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
                                  menuOpenId === task.id ? null : task.id
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
                              className="absolute right-2 top-8 z-20 bg-white dark:bg-surface border border-slate-200 dark:border-slate-700 rounded-md shadow-lg w-36 py-1"
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

                        <h4 className="font-semibold text-slate-800 mb-1 leading-tight">
                          {task.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                          {task.description}
                        </p>
                        {task.labels && task.labels.length > 0 && (
                          <div className="mt-1 flex gap-1 flex-wrap">
                            {task.labels.map((l, i) => (
                              <span
                                key={`${task.id}-label-${i}`}
                                className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200"
                              >
                                {l}
                              </span>
                            ))}
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

                        <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800">
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
                                  onClick={() =>
                                    setConfirmSubmitTaskId(task.id)
                                  }
                                  className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100 text-xs"
                                  title={`Submit for approval`}
                                >
                                  Submit
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => {
                                  updateTaskStatus(task.id, nextStatus).catch(
                                    () => {}
                                  );
                                }}
                                className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title={`Move to ${nextStatus}`}
                              >
                                <ArrowRight size={16} />
                              </button>
                            ))}
                          <button
                            className="ml-2 text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
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
                  <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs px-3 text-center">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      Nothing here yet
                    </span>
                    {col.id === TaskStatus.TODO && currentUser.role === "ADMIN" ? (
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

      {/* Confirm Delete Modal */}
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
          <div className="relative bg-white dark:bg-surface rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 w-[90%] max-w-md p-5 z-50">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Delete task?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              This action will remove "{confirmTask.title}". You can undo right
              after deletion.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => setConfirmTask(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
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
                    // context rolled the task back + interceptor toasted
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {/* Edit Task Modal */}
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
          <div className="relative bg-white dark:bg-surface rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 w-[95%] max-w-lg p-5 z-50">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Edit Task
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Title
                </label>
                <input
                  className="px-3 py-2 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
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
                <select
                  className="px-3 py-2 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  value={editTask.assigneeId || ""}
                  onChange={(e) =>
                    setEditTask({ ...editTask, assigneeId: e.target.value })
                  }
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Description
                </label>
                <textarea
                  className="px-3 py-2 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
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
                  className="px-3 py-2 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
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
                <select
                  className="px-3 py-2 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  value={editTask.priority}
                  onChange={(e) =>
                    setEditTask({
                      ...editTask,
                      priority: e.target.value as Priority,
                    })
                  }
                >
                  {Object.values(Priority).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Status
                </label>
                <select
                  className="px-3 py-2 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  value={editTask.status}
                  onChange={(e) =>
                    setEditTask({
                      ...editTask,
                      status: e.target.value as TaskStatus,
                    })
                  }
                >
                  {Object.values(TaskStatus).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {editError && (
              <p className="mt-3 text-sm text-red-500">{editError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
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
                    // interceptor toasted the error
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
          <div className="relative bg-white dark:bg-surface rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 w-[90%] max-w-md p-5 z-50">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Submit for approval?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              An admin will be notified to review this task before it can be
              marked Done.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => setConfirmSubmitTaskId(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
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
          <div className="relative bg-white dark:bg-surface rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 w-[90%] max-w-md p-5 z-50">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Approve this task?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Moves the task to Done and closes the approval request.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => setConfirmApproveTaskId(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"
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
      {showUndo && lastDeletedTask && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 z-50">
          <div className="bg-white dark:bg-surface border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg px-4 py-3 flex items-center gap-3">
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
