import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Kanban,
  MessageSquare,
  ShieldCheck,
  UserCircle,
  LogOut,
  Bell,
  PhoneCall,
  Users as UsersIcon,
  Inbox as InboxIcon,
  Search as SearchIcon,
  Moon,
  Sun,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import Avatar from "./Avatar";
import { useTheme } from "../context/ThemeContext";

interface SidebarProps {
  variant?: "desktop" | "mobile";
  onClose?: () => void;
  id?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  variant = "desktop",
  onClose,
  id,
}) => {
  const location = useLocation();
  const {
    currentUser,
    users,
    logout,
    isAuthenticated,
    notifications,
    directMessages,
    presence,
  } = useApp();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Accessibility: lock scroll and handle Escape when modal is open
  useEffect(() => {
    if (!confirmLogout) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmLogout(false);
    };
    const restore = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    setTimeout(() => modalRef.current?.focus(), 0);
    // Trigger animation after mount
    setTimeout(() => setModalVisible(true), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      restore?.focus?.();
    };
  }, [confirmLogout]);

  const closeModal = (after?: () => void) => {
    setModalVisible(false);
    // Wait for animation to finish
    setTimeout(() => {
      setConfirmLogout(false);
      after?.();
    }, 180);
  };

  const isActive = (path: string) => location.pathname === path;

  const notifCount = notifications.filter(
    (n) =>
      !n.read &&
      // Count any notification directly addressed to this user
      (n.recipientId === currentUser.id ||
        // Admins also see pending approvals count
        (currentUser.role === "ADMIN" && n.status === "PENDING"))
  ).length;

  const [pulse, setPulse] = useState(false);
  const prevCountRef = useRef<number>(notifCount);
  useEffect(() => {
    const prev = prevCountRef.current;
    if (notifCount > prev) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 500);
      return () => clearTimeout(t);
    }
    prevCountRef.current = notifCount;
  }, [notifCount]);

  const [adminToast, setAdminToast] = useState<string | null>(null);
  const prevAdminPendingRef = useRef<number>(0);
  useEffect(() => {
    if (currentUser.role !== "ADMIN") return;
    const adminPending = notifications.filter(
      (n) => n.status === "PENDING" && !n.read
    );
    const prev = prevAdminPendingRef.current;
    if (adminPending.length > prev) {
      setAdminToast("New approval request arrived");
      const timer = setTimeout(() => setAdminToast(null), 3000);
      return () => clearTimeout(timer);
    }
    prevAdminPendingRef.current = adminPending.length;
  }, [notifications, currentUser.role]);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Kanban, label: "Task Board", path: "/tasks" },
    { icon: MessageSquare, label: "Team Chat", path: "/chat" },
    { icon: SearchIcon, label: "Search", path: "/search" },
    {
      icon: InboxIcon,
      label: "Inbox",
      path: "/inbox",
      badge: directMessages.filter(
        (m) =>
          m.toUserId === currentUser.id &&
          !(m.readBy || []).includes(currentUser.id)
      ).length,
    },
    { icon: UsersIcon, label: "Members", path: "/members" },
    { icon: PhoneCall, label: "Huddles", path: "/huddles" },
    {
      icon: Bell,
      label: "Notifications",
      path: "/notifications",
      badge: notifCount,
    },
    { icon: UserCircle, label: "Profile", path: "/profile" },
  ];

  if (currentUser.role === "ADMIN") {
    navItems.push({ icon: ShieldCheck, label: "Admin Ops", path: "/admin" });
  }

  const containerBase =
    variant === "mobile"
      ? "w-[85vw] max-w-xs bg-white dark:bg-surface h-full flex flex-col border-r border-slate-200 dark:border-white/10"
      : "w-64 bg-white dark:bg-surface h-screen flex flex-col border-r border-slate-200 dark:border-white/10 sticky top-0";

  return (
    <div
      className={containerBase}
      id={id}
      tabIndex={variant === "mobile" ? -1 : undefined}
    >
      <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center gap-2">
        <Link
          to="/landing"
          onClick={variant === "mobile" ? onClose : undefined}
          aria-label="Go to landing"
          className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold hover:opacity-90"
        >
          N
        </Link>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Nebula
        </h1>
        {variant === "mobile" && (
          <button
            onClick={onClose}
            className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={variant === "mobile" ? onClose : undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.path)
                ? "bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:text-white"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            }`}
          >
            <item.icon size={20} />
            {item.label}
            {typeof (item as any).badge === "number" &&
              (item as any).badge > 0 && (
                <span
                  className={`ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-100 dark:text-amber-700 ${
                    pulse ? "animate-bounce" : ""
                  }`}
                >
                  {(item as any).badge}
                </span>
              )}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-white/10">
        <div className="mb-4 px-2">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase mb-2">
            Theme
          </p>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full px-3 py-2 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center justify-center gap-2 dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-100"
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>

        {isAuthenticated && (
          <div className="mb-4 px-2">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase mb-2">
              Account
            </p>
            <button
              onClick={() => setConfirmLogout(true)}
              className="w-full px-3 py-2 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-100"
            >
              Sign in as different user
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 px-2 pt-2">
          <Avatar
            src={currentUser.avatar}
            name={currentUser.name}
            alt="Profile"
            size="lg"
            className="border-2 border-white shadow-sm"
            status={
              presence[currentUser.id]?.inHuddleTrackId
                ? "in-huddle"
                : presence[currentUser.id]?.status || "offline"
            }
            showStatusDot
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate flex items-center gap-2">
              <span className="truncate">{currentUser.name}</span>
              {presence[currentUser.id]?.inHuddleTrackId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-violet-50 text-violet-700 border border-violet-200 shrink-0">
                  In huddle
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">
              {currentUser.role.toLowerCase()}
            </p>
          </div>
          <button
            onClick={() => setConfirmLogout(true)}
            className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {confirmLogout &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm logout"
          >
            <div
              className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
                modalVisible ? "opacity-100" : "opacity-0"
              }`}
              onClick={() => closeModal()}
            />
            <div
              className={`relative bg-white rounded-lg shadow-lg border border-slate-200 w-[90%] max-w-md p-5 z-[10000] outline-none transition-all duration-200 ease-out transform ${
                modalVisible
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 translate-y-1"
              }`}
              ref={modalRef}
              tabIndex={-1}
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Sign out?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                You will be signed out and can sign in as a different user.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  onClick={() => closeModal()}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                  onClick={() =>
                    closeModal(() => {
                      logout();
                      onClose?.();
                      navigate("/login");
                    })
                  }
                >
                  Log out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {adminToast && (
        <div className="fixed bottom-4 right-4 z-[9999]">
          <div className="bg-white border border-slate-200 shadow-lg rounded-lg px-4 py-3">
            <span className="text-sm text-slate-800">{adminToast}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
