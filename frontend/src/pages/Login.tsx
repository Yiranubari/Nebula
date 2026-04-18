import React, { useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import Spinner from "../components/Spinner";
import {
  isProbablySlowNetwork,
  runWithDelayedSpinner,
  sleep,
} from "../services/uiLoading";

const Login = () => {
  const { login, verifyOtp } = useApp();
  const { logout } = useApp(); // not strictly needed, but let's grab users as well if referenced, wait let's just do:
  const { login: doLogin, users, verifyOtp: doVerify } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot" | "otp" | "reset">(
    location.state?.requiresOtp ? "otp" : "login"
  );
  const [otpDigits, setOtpDigits] = useState<string[]>(() =>
    Array.from({ length: 6 }, () => "")
  );
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otpValue = useMemo(() => otpDigits.join(""), [otpDigits]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const onGoogleSignIn = () => {
    // UI-only placeholder: backend/OAuth wiring comes later.
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSigningIn) return;
    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }

    await runWithDelayedSpinner({
      setLoading: setIsSigningIn,
      fn: async () => {
        if (isProbablySlowNetwork()) {
          await sleep(650);
        }

        const ok = await doLogin(email, password);
        if (!ok) {
          // If the failure reason was "Please verify your email", let's move to OTP step.
          // For now, if we get an error that implies unverified, ideally api intercepts it.
          // Since the API error toast is handled globally, we just check if ok is false.
          // If we want to jump to OTP, we can add a check if they are unverified. Let's just do standard response.
          return;
        }
        navigate("/dashboard");
      },
    });
  };

  const onSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }
    // UI-only: pretend we sent an OTP.
    setOtpDigits(Array.from({ length: 6 }, () => ""));
    setMode("otp");
    setTimeout(() => otpRefs.current?.[0]?.focus(), 0);
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue || otpValue.length !== 6) {
      toast.error("Please enter the 6-digit code.");
      return;
    }
        const ok = await doVerify(email, otpValue);
        if (!ok) {
          // Toast shows error
          return;
        }
        navigate("/dashboard");
  };

  const onResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      toast.error("Password should be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    // UI-only: pretend reset succeeded.
    setNewPassword("");
    setConfirmPassword("");
    setOtpDigits(Array.from({ length: 6 }, () => ""));
    toast.success("Password reset UI complete. You can sign in now.");
    setMode("login");
  };

  const handleOtpChange = (index: number, nextValue: string) => {
    const digit = (nextValue || "").replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const copy = prev.slice();
      copy[index] = digit;
      return copy;
    });
    if (digit && index < 5) {
      otpRefs.current?.[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (otpDigits[index]) {
        setOtpDigits((prev) => {
          const copy = prev.slice();
          copy[index] = "";
          return copy;
        });
        return;
      }
      if (index > 0) {
        otpRefs.current?.[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current?.[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current?.[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text") || "";
    const digits = text.replace(/\D/g, "").slice(0, 6).split("");
    if (digits.length === 0) return;
    e.preventDefault();
    setOtpDigits((prev) => {
      const copy = prev.slice();
      for (let i = 0; i < 6; i++) copy[i] = digits[i] ?? "";
      return copy;
    });
    const nextIndex = Math.min(digits.length, 6) - 1;
    setTimeout(() => otpRefs.current?.[Math.max(nextIndex, 0)]?.focus(), 0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark">
      <div className="bg-white dark:bg-surface w-[90%] max-w-md rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-200 rounded-lg">
            <LogIn size={20} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {mode === "login"
              ? "Sign in to Nebula"
              : mode === "forgot"
              ? "Forgot password"
              : mode === "otp"
              ? "Enter OTP code"
              : "Reset password"}
          </h1>
        </div>
        {mode === "login" && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSigningIn}
              aria-busy={isSigningIn}
              className={`w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium inline-flex items-center justify-center gap-2 ${
                isSigningIn ? "opacity-80 cursor-not-allowed" : ""
              }`}
            >
              {isSigningIn ? (
                <>
                  <Spinner size={18} className="text-white" />
                  <span>Sign In</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>

            <div className="relative py-1">
              <div className="h-px bg-slate-200 dark:bg-slate-800" />
              <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white dark:bg-surface px-2 text-xs text-slate-500 dark:text-slate-400">
                OR
              </span>
            </div>

            <button
              type="button"
              onClick={onGoogleSignIn}
              className="w-full px-4 py-3 bg-white dark:bg-surface border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-100 rounded-lg font-medium inline-flex items-center justify-center gap-3"
              aria-label="Sign in with Google"
            >
              <span className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.9-6.9C36.1 2.4 30.5 0 24 0 14.6 0 6.4 5.4 2.4 13.2l8 6.2C12.3 13 17.7 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v7.8h12.5c-.3 2-1.6 5-4.5 7l7 5.4c4.1-3.8 6.1-9.4 6.1-16.1z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.4 28.8c-.5-1.6-.8-3.3-.8-5s.3-3.4.8-5L2.4 12.6C.9 15.6 0 19 0 22.8c0 3.8.9 7.2 2.4 10.2l8-4.2z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.5 0 12-2.1 16-5.8l-7-5.4c-1.9 1.3-4.4 2.2-9 2.2-6.3 0-11.7-3.5-13.6-8.5l-8 6.2C6.4 42.6 14.6 48 24 48z"
                  />
                </svg>
              </span>
              Sign in with Google
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("forgot");
              }}
              className="w-full text-sm text-indigo-600 hover:text-indigo-700"
            >
              Forgot password?
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={onSendOtp} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Enter your email and we’ll send you a one-time code.
            </p>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              Send OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
              }}
              className="w-full inline-flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"
            >
              <ArrowLeft size={16} /> Back to sign in
            </button>
          </form>
        )}

        {mode === "otp" && (
          <form onSubmit={onVerifyOtp} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Enter the 6-digit code sent to{" "}
              <span className="font-medium">{email || "your email"}</span>.
            </p>
            <div
              className="flex items-center justify-between gap-2"
              onPaste={handleOtpPaste}
            >
              {otpDigits.map((d, idx) => (
                <input
                  key={`otp-${idx}`}
                  ref={(el) => {
                    otpRefs.current[idx] = el;
                  }}
                  inputMode="numeric"
                  autoComplete={idx === 0 ? "one-time-code" : "off"}
                  value={d}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-11 h-12 text-center text-lg bg-white dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100"
                  aria-label={`OTP digit ${idx + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                }}
                className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 inline-flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpDigits(Array.from({ length: 6 }, () => ""));
                  setTimeout(() => otpRefs.current?.[0]?.focus(), 0);
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Resend code
              </button>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              Verify OTP
            </button>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={onResetPassword} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Create a new password.
            </p>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  aria-label={
                    showNewPassword ? "Hide password" : "Show password"
                  }
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                  title={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              Reset Password
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("login");
              }}
              className="w-full inline-flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"
            >
              <ArrowLeft size={16} /> Back to sign in
            </button>
          </form>
        )}
        {mode === "login" && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-4">
            No account?{" "}
            <Link
              to="/signup"
              className="text-indigo-600 hover:text-indigo-700"
            >
              Sign up
            </Link>
          </p>
        )}

        {mode === "login" && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Demo emails
            </p>
            <div className="flex flex-wrap gap-2">
              {users.slice(0, 4).map((u) => (
                <button
                  key={u.id}
                  onClick={() => setEmail(u.email)}
                  className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100"
                >
                  {u.email}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
