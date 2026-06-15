import React, { useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import Spinner from "../components/Spinner";
import { api } from "../services/api";
import {
  isProbablySlowNetwork,
  runWithDelayedSpinner,
  sleep,
} from "../services/uiLoading";

const Login = () => {
  const { login: doLogin, verifyOtp: doVerify } = useApp();
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

  const isValidEmail = (s: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSigningIn) return;
    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!password) {
      toast.error("Please enter your password.");
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
          return;
        }
        navigate("/dashboard");
      },
    });
  };

  const requestOtp = async (): Promise<boolean> => {
    try {
      await api.post("/auth/resend-otp", { email });
      return true;
    } catch {
      return false;
    }
  };

  const onSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !isValidEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    const ok = await requestOtp();
    if (ok) {
      toast.success(`Verification code sent to ${email}.`);
      setOtpDigits(Array.from({ length: 6 }, () => ""));
      setMode("otp");
      setTimeout(() => otpRefs.current?.[0]?.focus(), 0);
    }
  };

  const onResendOtp = async () => {
    if (!email.trim() || !isValidEmail(email)) {
      toast.error("Missing or invalid email.");
      return;
    }
    const ok = await requestOtp();
    if (ok) {
      toast.success("New code sent. Check your email.");
      setOtpDigits(Array.from({ length: 6 }, () => ""));
      setTimeout(() => otpRefs.current?.[0]?.focus(), 0);
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue || otpValue.length !== 6) {
      toast.error("Please enter the 6-digit code.");
      return;
    }
        const ok = await doVerify(email, otpValue);
        if (!ok) {
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
    <div className="dark min-h-screen relative flex items-center justify-center bg-slate-900 overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-600/30 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      </div>
      <div className="relative z-10 bg-white/[0.03] backdrop-blur-xl w-[90%] max-w-md rounded-3xl shadow-[0_8px_40px_rgba(15,23,42,0.4)] border border-white/[0.06] p-7 text-white">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_28px_rgba(99,102,241,0.35)]">
            <LogIn size={20} strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
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
                className="px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15 outline-none text-slate-100 placeholder:text-slate-500 transition-colors"
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
                  className="w-full px-4 py-3 pr-12 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15 outline-none text-slate-100 placeholder:text-slate-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-colors"
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
              className={`w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium inline-flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(99,102,241,0.25)] hover:shadow-[0_0_36px_rgba(99,102,241,0.35)] transition-shadow ${
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

            <button
              type="button"
              onClick={() => {
                setMode("forgot");
              }}
              className="w-full text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
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
                className="px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15 outline-none text-slate-100 placeholder:text-slate-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium shadow-[0_0_28px_rgba(99,102,241,0.25)] hover:shadow-[0_0_36px_rgba(99,102,241,0.35)] transition-shadow"
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
                  className="w-11 h-12 text-center text-lg bg-white/[0.04] border border-white/[0.08] rounded-xl focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15 outline-none text-slate-100 transition-colors"
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
                onClick={onResendOtp}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Resend code
              </button>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium shadow-[0_0_28px_rgba(99,102,241,0.25)] hover:shadow-[0_0_36px_rgba(99,102,241,0.35)] transition-shadow"
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
                  className="w-full px-4 py-3 pr-12 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15 outline-none text-slate-100 placeholder:text-slate-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-colors"
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
                  className="w-full px-4 py-3 pr-12 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15 outline-none text-slate-100 placeholder:text-slate-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-colors"
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
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium shadow-[0_0_28px_rgba(99,102,241,0.25)] hover:shadow-[0_0_36px_rgba(99,102,241,0.35)] transition-shadow"
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
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sign up
            </Link>
          </p>
        )}

      </div>
    </div>
  );
};

export default Login;
