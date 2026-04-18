import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { TaskStatus, Priority } from "../types";
import {
  Check,
  BrainCircuit,
  ShieldCheck,
  UserMinus,
  Mail,
  Send,
  RefreshCw,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Spinner from "../components/Spinner";

const AdminPanel = () => {
  const {
    addTask,
    currentUser,
    users,
    removeUser,
    updateUserRole,
    inviteMember,
  } = useApp();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedHours, setEstimatedHours] = useState<number>(2);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{
    userId: string;
    to: "ADMIN" | "MEMBER";
  } | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const verifiedUsers = useMemo(
    () => users.filter((u) => u.isVerified !== false),
    [users]
  );
  const pendingInvites = useMemo(
    () => users.filter((u) => u.isVerified === false),
    [users]
  );

  const isValidEmail = (s: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  // Protect Route
  if (currentUser.role !== "ADMIN") {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-slate-600 dark:text-slate-300">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  const handleCreateTask = async () => {
    setError("");
    // Basic validations
    if (!title.trim()) return setError("Please enter a task title.");
    if (!description.trim())
      return setError("Please enter a task description.");
    if (!assigneeId) return setError("Please select an assignee.");
    if (!estimatedHours || estimatedHours <= 0)
      return setError("Estimated hours must be a positive number.");
    if (isCreatingTask) return;

    setIsCreatingTask(true);
    try {
      await addTask({
        id: `admin-${Date.now()}`,
        title,
        description,
        status,
        priority,
        estimatedHours,
        assigneeId,
        createdAt: new Date().toISOString(),
      });
      navigate("/tasks");
    } catch {
      // API interceptor shows the server's error.
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleSendInvite = async () => {
    setInviteError("");
    if (!inviteEmail.trim() || !isValidEmail(inviteEmail)) {
      setInviteError("Please enter a valid email address.");
      return;
    }
    if (isInviting) return;
    setIsInviting(true);
    try {
      await inviteMember(inviteEmail.trim());
      setInviteEmail("");
    } catch {
      // Interceptor surfaces the server error.
    } finally {
      setIsInviting(false);
    }
  };

  const handleResendInvite = async (email: string, userId: string) => {
    if (resendingId) return;
    setResendingId(userId);
    try {
      await inviteMember(email);
    } catch {
      // Interceptor surfaces the server error.
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl text-indigo-600 dark:text-indigo-200 border border-indigo-500/20">
          <BrainCircuit size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand">
            Admin Operations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage team members and create tasks with full assignment control.
          </p>
        </div>
      </div>

      {/* Team Members */}
      <div className="mt-8 glass-panel p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Team Members
        </h2>
        <div className="space-y-2">
          {verifiedUsers.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <img
                  src={u.avatar}
                  alt={u.name}
                  className="w-6 h-6 rounded-full"
                />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {u.name}{" "}
                    {u.role === "ADMIN" && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        (Admin)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {u.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {u.id !== currentUser.id && (
                  u.role === "ADMIN" ? (
                    <button
                      onClick={() =>
                        setConfirmRoleChange({ userId: u.id, to: "MEMBER" })
                      }
                      className="px-3 py-1.5 text-xs inline-flex items-center gap-1.5 border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-lg"
                      title="Demote to member"
                    >
                      <UserMinus size={13} />
                      Demote
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        setConfirmRoleChange({ userId: u.id, to: "ADMIN" })
                      }
                      className="px-3 py-1.5 text-xs inline-flex items-center gap-1.5 border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-200 rounded-lg"
                      title="Promote to admin"
                    >
                      <ShieldCheck size={13} />
                      Promote
                    </button>
                  )
                )}
                <button
                  onClick={() => setConfirmUserId(u.id)}
                  disabled={deletingUserId === u.id}
                  className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-60"
                >
                  {deletingUserId === u.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite a member */}
      <div className="mt-8 glass-panel p-6 rounded-2xl shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/20">
            <Mail size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Invite a member
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Send an email with a verification code. They'll land on a page to
              set their name and password.
            </p>
          </div>
        </div>
        <form
          className="flex flex-col md:flex-row gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendInvite();
          }}
        >
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@example.com"
            className="flex-1 px-4 py-3 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm border border-slate-200/70 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={isInviting}
            aria-busy={isInviting}
            className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
          >
            {isInviting ? (
              <Spinner size={16} className="text-white" />
            ) : (
              <Send size={16} />
            )}
            {isInviting ? "Sending…" : "Send invite"}
          </button>
        </form>
        {inviteError && (
          <p className="mt-3 text-red-500 text-sm">{inviteError}</p>
        )}
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="mt-8 glass-panel p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending invites
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              ({pendingInvites.length})
            </span>
          </h2>
          <div className="space-y-2">
            {pendingInvites.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 border border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                    <Mail size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {u.email}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Waiting for them to finish setup
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleResendInvite(u.email, u.id)}
                    disabled={resendingId === u.id}
                    className="px-3 py-1.5 text-xs inline-flex items-center gap-1.5 border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-lg disabled:opacity-60"
                    title="Resend invitation email"
                  >
                    {resendingId === u.id ? (
                      <Spinner size={12} />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {resendingId === u.id ? "Resending…" : "Resend"}
                  </button>
                  <button
                    onClick={() => setConfirmUserId(u.id)}
                    className="px-3 py-1.5 text-xs inline-flex items-center gap-1.5 border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-700 dark:text-red-300 rounded-lg"
                    title="Revoke invitation"
                  >
                    <X size={12} />
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Task Creation */}
      <div className="mt-8 glass-panel p-6 rounded-2xl shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-slate-100"
              >
                {Object.values(TaskStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short, action-oriented title"
              className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-slate-100"
            >
              <option value="" disabled>
                Select a team member
              </option>
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed explanation of what needs to be done"
              rows={4}
              className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Estimated Hours
            </label>
            <input
              type="number"
              min={1}
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(Number(e.target.value))}
              className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-slate-100"
            >
              {Object.values(Priority).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="mt-3 text-red-500 text-sm">{error}</p>}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleCreateTask}
            disabled={isCreatingTask}
            aria-busy={isCreatingTask}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {isCreatingTask ? (
              <Spinner size={16} className="text-white" />
            ) : (
              <Check size={16} />
            )}
            {isCreatingTask ? "Creating…" : "Create Task"}
          </button>
        </div>
      </div>

      {confirmUserId && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete user"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmUserId(null)}
          />
          <div className="relative bg-white dark:bg-surface rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 w-[90%] max-w-md p-5 z-50">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Delete member?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              This will remove the member and unassign their tasks. This cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                onClick={() => setConfirmUserId(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-2 disabled:opacity-60"
                disabled={!!deletingUserId}
                onClick={async () => {
                  const id = confirmUserId;
                  setConfirmUserId(null);
                  if (!id) return;
                  setDeletingUserId(id);
                  try {
                    await removeUser(id);
                  } catch {
                    // API interceptor shows the error toast.
                  } finally {
                    setDeletingUserId(null);
                  }
                }}
              >
                {deletingUserId && <Spinner size={16} className="text-white" />}
                {deletingUserId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRoleChange && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm role change"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isUpdatingRole && setConfirmRoleChange(null)}
          />
          <div className="relative bg-white dark:bg-surface rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 w-[90%] max-w-md p-5 z-50">
            {(() => {
              const target = users.find(
                (u) => u.id === confirmRoleChange.userId
              );
              const toAdmin = confirmRoleChange.to === "ADMIN";
              return (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                    {toAdmin ? "Promote to admin?" : "Demote to member?"}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                    {toAdmin ? (
                      <>
                        <span className="font-medium">{target?.name}</span> will
                        get full access to manage members, tasks, tracks, and
                        settings.
                      </>
                    ) : (
                      <>
                        <span className="font-medium">{target?.name}</span> will
                        lose admin privileges and become a regular member.
                      </>
                    )}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-60"
                      disabled={isUpdatingRole}
                      onClick={() => setConfirmRoleChange(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg text-white inline-flex items-center gap-2 disabled:opacity-60 ${
                        toAdmin
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-slate-700 hover:bg-slate-800"
                      }`}
                      disabled={isUpdatingRole}
                      onClick={async () => {
                        const change = confirmRoleChange;
                        if (!change) return;
                        setIsUpdatingRole(true);
                        try {
                          await updateUserRole(change.userId, change.to);
                          setConfirmRoleChange(null);
                        } catch {
                          // API interceptor shows the error toast.
                        } finally {
                          setIsUpdatingRole(false);
                        }
                      }}
                    >
                      {isUpdatingRole && (
                        <Spinner size={16} className="text-white" />
                      )}
                      {isUpdatingRole
                        ? "Updating…"
                        : toAdmin
                        ? "Promote"
                        : "Demote"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
