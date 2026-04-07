import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { useNavigate, Link } from "react-router-dom";
import Avatar from "../components/Avatar";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import Spinner from "../components/Spinner";
import {
  isProbablySlowNetwork,
  runWithDelayedSpinner,
  sleep,
} from "../services/uiLoading";

const Signup = () => {
  const { signup } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSigningUp) return;
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Please provide name and email.");
      return;
    }

    await runWithDelayedSpinner({
      setLoading: setIsSigningUp,
      fn: async () => {
        if (isProbablySlowNetwork()) {
          await sleep(650);
        }
        signup(name, email, avatar);
        navigate("/dashboard");
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark">
      <div className="bg-white dark:bg-surface w-[90%] max-w-md rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-200 rounded-lg">
            <UserPlus size={20} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Create your Nebula account
          </h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar src={avatar} name={name} size="lg" />
            <input
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="Avatar URL (optional)"
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
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
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100"
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
                placeholder="Create a password"
                className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isSigningUp}
            aria-busy={isSigningUp}
            className={`w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium inline-flex items-center justify-center gap-2 ${
              isSigningUp ? "opacity-80 cursor-not-allowed" : ""
            }`}
          >
            {isSigningUp ? (
              <>
                <Spinner size={18} className="text-white" />
                <span>Sign Up</span>
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
