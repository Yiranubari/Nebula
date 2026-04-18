import React, { useState } from "react";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { TaskStatus, Priority } from "../types";
import { Check, BrainCircuit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Spinner from "../components/Spinner";

const AdminPanel = () => {
  const { addTask, addUser, currentUser, users, removeUser } = useApp();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedHours, setEstimatedHours] = useState<number>(2);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [error, setError] = useState("");
  const [memberError, setMemberError] = useState("");
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);

  // New member form state
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [memberAvatar, setMemberAvatar] = useState("");

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

  const handleAddMember = () => {
    setMemberError("");
    if (!memberName.trim())
      return setMemberError("Please enter the member's name.");
    if (!memberEmail.trim() || !isValidEmail(memberEmail))
      return setMemberError("Please enter a valid email address.");
    if (isAddingMember) return;

    setIsAddingMember(true);
    try {
      const id = `u-${Date.now()}`;
      const avatar =
        memberAvatar.trim() ||
        `https://picsum.photos/100/100?random=${Math.floor(
          Math.random() * 1000
        )}`;
      addUser({
        id,
        name: memberName.trim(),
        email: memberEmail.trim(),
        role: memberRole,
        avatar,
      });
      toast.success(`${memberName.trim()} added to the team.`);
      setMemberName("");
      setMemberEmail("");
      setMemberRole("MEMBER");
      setMemberAvatar("");
    } finally {
      setIsAddingMember(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-200">
          <BrainCircuit size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Admin Task Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Create tasks manually, assign to a specific team member, and set
            priority.
          </p>
        </div>
      </div>

      {/* Team Members */}
      <div className="mt-8 bg-white dark:bg-surface p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Team Members
        </h2>
        <div className="space-y-2">
          {users.map((u) => (
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
              <button
                onClick={() => setConfirmUserId(u.id)}
                disabled={deletingUserId === u.id}
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-60"
              >
                {deletingUserId === u.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Team Member */}
      <div className="mt-8 bg-white dark:bg-surface p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Add Team Member
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Name
            </label>
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Full name"
              className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Email
            </label>
            <input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="member@example.com"
              className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Role
            </label>
            <select
              value={memberRole}
              onChange={(e) =>
                setMemberRole(e.target.value as "ADMIN" | "MEMBER")
              }
              className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-slate-100"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Avatar URL (optional)
            </label>
            <input
              type="url"
              value={memberAvatar}
              onChange={(e) => setMemberAvatar(e.target.value)}
              placeholder="https://..."
              className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
        {memberError && (
          <p className="mt-3 text-red-500 text-sm">{memberError}</p>
        )}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleAddMember}
            disabled={isAddingMember}
            aria-busy={isAddingMember}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-60"
          >
            {isAddingMember && <Spinner size={16} className="text-white" />}
            {isAddingMember ? "Adding…" : "Add Member"}
          </button>
        </div>
      </div>

      {/* Manual Task Creation */}
      <div className="mt-8 bg-white dark:bg-surface p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
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
    </div>
  );
};

export default AdminPanel;
