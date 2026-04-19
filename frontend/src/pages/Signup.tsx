import React, { useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, UserPlus, Mail } from "lucide-react";
import toast from "react-hot-toast";
import Spinner from "../components/Spinner";
import {
  isProbablySlowNetwork,
  runWithDelayedSpinner,
  sleep,
} from "../services/uiLoading";

const Signup = () => {
  const { signup, completeInvite } = useApp();
  const [searchParams] = useSearchParams();
  const inviteEmail = searchParams.get("invite")?.trim() || "";
  const isInviteMode = !!inviteEmail;

  const [name, setName] = useState("");
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Invite-mode only: OTP digits for the email verification code.
  const [otpDigits, setOtpDigits] = useState<string[]>(() =>
    Array.from({ length: 6 }, () => "")
  );
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otpValue = useMemo(() => otpDigits.join(""), [otpDigits]);
  const navigate = useNavigate();

  const isValidEmail = (s: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  const handleOtpChange = (index: number, nextValue: string) => {
    const digit = (nextValue || "").replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const copy = prev.slice();
      copy[index] = digit;
      return copy;
    });
    if (digit && index < 5) otpRefs.current?.[index + 1]?.focus();
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
      if (index > 0) otpRefs.current?.[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0)
      otpRefs.current?.[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5)
      otpRefs.current?.[index + 1]?.focus();
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSigningUp) return;
    if (!name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!isInviteMode && (!email.trim() || !isValidEmail(email))) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (isInviteMode && (otpValue.length !== 6)) {
      toast.error("Please enter the 6-digit code from the email.");
      return;
    }

    await runWithDelayedSpinner({
      setLoading: setIsSigningUp,
      fn: async () => {
        if (isProbablySlowNetwork()) {
          await sleep(650);
        }
        if (isInviteMode) {
          const ok = await completeInvite({
            email: inviteEmail,
            name: name.trim(),
            password,
            otp: otpValue,
          });
          if (ok) navigate("/dashboard");
        } else {
          const ok = await signup(
            name,
            email,
            password,
            undefined,
            workspaceName.trim() || undefined
          );
          if (ok) {
            navigate("/login", { state: { requiresOtp: true, email } });
          }
        }
      },
    });
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
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_28px_rgba(99,102,241,0.35)]">
            {isInviteMode ? <Mail size={20} strokeWidth={1.75} /> : <UserPlus size={20} strokeWidth={1.75} />}
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              {isInviteMode
                ? "Complete your invitation"
                : "Create your Nebula account"}
            </h1>
            {isInviteMode && (
              <p className="text-xs text-slate-400 mt-0.5">
                Enter the 6-digit code from the email, then set your name and
                password.
              </p>
            )}
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15 outline-none text-slate-100 transition-colors"
            />
          </div>
          {!isInviteMode && (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Workspace name
              </label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder={
                  name ? `${name}'s Workspace` : "Your team's workspace"
                }
                className="px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15 outline-none text-slate-100 placeholder:text-slate-500 transition-colors"
              />
              <p className="mt-1 text-xs text-slate-400">
                You'll be the admin of this workspace and can invite your team
                later.
              </p>
            </div>
          )}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={isInviteMode}
              className={`px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15 outline-none text-slate-100 transition-colors ${
                isInviteMode ? "opacity-60 cursor-not-allowed" : ""
              }`}
            />
            {isInviteMode && (
              <p className="mt-1 text-xs text-slate-400">
                Locked to the address your invitation was sent to.
              </p>
            )}
          </div>
          {isInviteMode && (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Verification code
              </label>
              <div
                className="flex items-center justify-between gap-2"
                onPaste={handleOtpPaste}
              >
                {otpDigits.map((d, idx) => (
                  <input
                    key={`invite-otp-${idx}`}
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
              <p className="mt-1 text-xs text-slate-400">
                6-digit code from the invitation email.
              </p>
            </div>
          )}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
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
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              At least 8 characters.
            </p>
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
                placeholder="Re-enter your password"
                className="w-full px-4 py-3 pr-12 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15 outline-none text-slate-100 placeholder:text-slate-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword.length > 0 && confirmPassword !== password && (
              <p className="mt-1 text-xs text-red-500">
                Passwords do not match.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSigningUp}
            aria-busy={isSigningUp}
            className={`w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium inline-flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(99,102,241,0.25)] hover:shadow-[0_0_36px_rgba(99,102,241,0.35)] transition-shadow ${
              isSigningUp ? "opacity-80 cursor-not-allowed" : ""
            }`}
          >
            {isSigningUp ? (
              <>
                <Spinner size={18} className="text-white" />
                <span>{isInviteMode ? "Completing…" : "Sign Up"}</span>
              </>
            ) : isInviteMode ? (
              "Complete invitation"
            ) : (
              "Sign Up"
            )}
          </button>
        </form>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
