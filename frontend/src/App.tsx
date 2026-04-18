import React, { useEffect, useRef, useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { SocketProvider } from "./context/SocketContext";
import { CallProvider } from "./context/CallContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import TaskBoard from "./pages/TaskBoard";
import Chat from "./pages/Chat";
import AdminPanel from "./pages/AdminPanel";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Huddles from "./pages/Huddles";
import Inbox from "./pages/Inbox";
import Members from "./pages/Members";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { useApp } from "./context/AppContext";
import Landing from "./pages/Landing";
import { Menu, Moon, Sun } from "lucide-react";
import SearchPage from "./pages/Search";
import { ThemeProvider } from "./context/ThemeContext";
import { useTheme } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";
import { useSocket } from "./context/SocketContext";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  public state: { error: Error | null } = { error: null };
  public props!: Readonly<{ children: React.ReactNode }>;
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error("App runtime error:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <h2 className="text-xl font-bold text-red-600 mb-2">
            Something went wrong.
          </h2>
          <pre className="text-sm bg-red-50 border border-red-200 rounded p-3 overflow-auto whitespace-pre-wrap">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <p className="text-slate-600 mt-2">
            Check the browser console for details.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const { isAuthenticated } = useApp();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isPublicRoute = ["/", "/login", "/signup", "/landing"].includes(
    location.pathname
  );

  // Handle Escape to close, focus trapping, and body scroll lock for mobile menu
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !dialogRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    const restore = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    // Focus dialog container next tick
    setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      restore?.focus?.();
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen font-sans bg-slate-50 text-slate-900 dark:bg-dark dark:text-slate-100">
      {/* Desktop sidebar */}
      {isAuthenticated && !isPublicRoute && (
        <div className="hidden md:block">
          <Sidebar variant="desktop" />
        </div>
      )}

      {/* Mobile top bar */}
      {isAuthenticated && !isPublicRoute ? (
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 dark:bg-surface dark:border-white/10 z-40 flex items-center px-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-controls="mobile-sidebar"
            aria-expanded={mobileOpen}
          >
            <Menu size={20} />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
              N
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              Nebula
            </span>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="ml-auto p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      ) : null}

      {/* Mobile sidebar overlay */}
      {isAuthenticated && !isPublicRoute && mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            role="presentation"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="fixed inset-y-0 left-0 z-50 outline-none"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            ref={dialogRef}
            tabIndex={-1}
          >
            <Sidebar
              id="mobile-sidebar"
              variant="mobile"
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      <main className="flex-1 min-h-screen min-w-0 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-dark pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
};

function App() {
  const RequireAuth = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useApp();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
  };
  const HomeRoute = () => {
    const { isAuthenticated } = useApp();
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />;
  };

  /**
   * SocketConnector — lives inside AppProvider + SocketProvider so it can read
   * auth state and the access token from localStorage, then call socket.connect().
   * On logout / unauthenticated, it tears the socket down.
   */
  const SocketConnector = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useApp();
    const { connect, disconnect, isConnected } = useSocket();

    useEffect(() => {
      if (isAuthenticated) {
        // Grab the JWT that was stored at login
        const token =
          localStorage.getItem("nebula.accessToken") ||
          localStorage.getItem("nebula.token.v1") ||
          "";
        if (token && !isConnected) {
          connect(token);
        }
      } else {
        disconnect();
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    return <>{children}</>;
  };

  return (
    <ThemeProvider>
      <SocketProvider>
        <AppProvider>
          <SocketConnector>
            <CallProvider>
              <HashRouter>
                <Toaster position="top-right" toastOptions={{ className: 'dark:bg-slate-800 dark:text-white' }} />
                <Layout>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<HomeRoute />} />
                      <Route path="/landing" element={<Landing />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route
                        path="/dashboard"
                        element={
                          <RequireAuth>
                            <Dashboard />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/tasks"
                        element={
                          <RequireAuth>
                            <TaskBoard />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/chat"
                        element={
                          <RequireAuth>
                            <Chat />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/search"
                        element={
                          <RequireAuth>
                            <SearchPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/inbox"
                        element={
                          <RequireAuth>
                            <Inbox />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/members"
                        element={
                          <RequireAuth>
                            <Members />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <RequireAuth>
                            <Profile />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/notifications"
                        element={
                          <RequireAuth>
                            <Notifications />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/huddles"
                        element={
                          <RequireAuth>
                            <Huddles />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/admin"
                        element={
                          <RequireAuth>
                            <AdminPanel />
                          </RequireAuth>
                        }
                      />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </ErrorBoundary>
                </Layout>
              </HashRouter>
            </CallProvider>
          </SocketConnector>
        </AppProvider>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;

