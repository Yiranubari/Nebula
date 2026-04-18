import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import Spinner from "../components/Spinner";
import { UserCircle, Image as ImageIcon, Trash2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

const Profile = () => {
  const { currentUser, users, updateCurrentUser, removeUser } = useApp();
  const [searchParams] = useSearchParams();
  const viewUserId = searchParams.get("userId");
  const viewUser = users.find((u) => u.id === viewUserId) || currentUser;
  const isSelf = !viewUserId || viewUserId === currentUser.id;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar || "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isValidEmail = (s: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  const canSave = useMemo(() => {
    return (
      name.trim().length > 0 &&
      email.trim().length > 0 &&
      isValidEmail(email)
    );
  }, [name, email]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      const msg = "Please select a valid image file.";
      setError(msg);
      toast.error(msg);
      return;
    }
    const maxBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxBytes) {
      const msg = "Image is too large (max 2MB).";
      setError(msg);
      toast.error(msg);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    setError("");
    if (!name.trim()) {
      setError("Please enter your name.");
      toast.error("Please enter your name.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      toast.error("Please enter a valid email address.");
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    try {
      await updateCurrentUser({
        name: name.trim(),
        email: email.trim(),
        avatar: avatarUrl,
      });
    } catch {
      // API interceptor shows the error toast; keep inline hint too.
      setError("Could not save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const onRemovePhoto = () => {
    setAvatarUrl("");
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-200">
          <UserCircle size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isSelf ? "My Profile" : `${viewUser.name}'s Profile`}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {isSelf
              ? "Update your personal information and photo."
              : "View member details."}
          </p>
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-surface p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        {isSelf ? (
          <div className="flex items-center gap-4">
            <Avatar
              src={avatarUrl}
              name={name}
              size="xl"
              className="border-2 border-white shadow-sm"
            />
            <div>
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                <ImageIcon size={16} />
                <span>Upload new photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />
              </label>
              <button
                onClick={onRemovePhoto}
                className="ml-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
              >
                Remove photo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Avatar
              src={viewUser.avatar}
              name={viewUser.name}
              size="xl"
              className="border-2 border-white shadow-sm"
            />
            <div className="text-sm text-slate-700 dark:text-slate-200">
              <p className="font-semibold">{viewUser.name}</p>
              <p className="text-slate-500 dark:text-slate-400">{viewUser.email}</p>
              <p className="text-slate-500 dark:text-slate-400 capitalize">
                {viewUser.role.toLowerCase()}
              </p>
              <div className="mt-3">
                <Link
                  to={`/inbox?with=${viewUser.id}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  Message
                </Link>
              </div>
            </div>
          </div>
        )}

        {isSelf ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="md:col-span-2 flex justify-end mt-2">
              <button
                onClick={onSave}
                disabled={!canSave || isSaving}
                aria-busy={isSaving}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isSaving && <Spinner size={16} className="text-white" />}
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Full Name
              </label>
              <div className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100">
                {viewUser.name}
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Email
              </label>
              <div className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100">
                {viewUser.email}
              </div>
            </div>
          </div>
        )}
        {error && <p className="mt-3 text-red-500 text-sm">{error}</p>}
      </div>

      {/* Danger Zone */}
      {isSelf && (
        <div className="mt-8 bg-white dark:bg-surface p-6 rounded-xl shadow-sm border border-red-200 dark:border-red-500/40">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Danger Zone
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Delete your account and remove your access. Your assigned tasks will
            be unassigned.
          </p>
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
          >
            <Trash2 size={16} /> Delete My Account
          </button>
        </div>
      )}

      {isSelf && confirmDelete && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete account"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmDelete(false)}
          />
          <div className="relative bg-white dark:bg-surface rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 w-[90%] max-w-md p-5 z-50">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Delete your account?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              This will remove your account and unassign your tasks. This cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-2 disabled:opacity-60"
                disabled={isDeleting}
                onClick={async () => {
                  if (isDeleting) return;
                  setIsDeleting(true);
                  try {
                    await removeUser(currentUser.id);
                    setConfirmDelete(false);
                  } catch {
                    // API interceptor shows the error toast.
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                {isDeleting && <Spinner size={16} className="text-white" />}
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
