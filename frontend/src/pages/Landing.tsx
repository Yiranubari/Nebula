import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Rocket,
  ShieldCheck,
  MessageSquare,
  Kanban,
  ArrowRight,
  Github,
  Twitter,
  Linkedin,
} from "lucide-react";

const Landing = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 30);
    return () => window.clearTimeout(t);
  }, []);

  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="min-h-screen overflow-hidden bg-dark text-slate-100 relative">
      {/* Animated space background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-dark via-slate-950 to-surface" />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-secondary/10" />

        {/* Nebula glow blobs */}
        <div className="nebula-blob absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="nebula-blob absolute top-24 -right-32 h-[28rem] w-[28rem] rounded-full bg-secondary/10 blur-3xl" />
        <div className="nebula-blob absolute -bottom-32 left-1/3 h-[30rem] w-[30rem] rounded-full bg-primary/10 blur-3xl" />

        {/* Cosmic objects (planets, galaxies) */}
        <div className="absolute inset-0 opacity-90">
          {/* Distant spiral galaxy */}
          <svg
            className="cosmic-galaxy absolute -left-24 top-6 w-[420px] h-[420px] text-secondary/25 blur-[0.5px]"
            viewBox="0 0 200 200"
            fill="none"
          >
            <g stroke="currentColor" strokeWidth="1.2" opacity="0.9">
              <path d="M100 20c-30 0-54 24-54 54s24 54 54 54 54-24 54-54" />
              <path d="M100 34c-22.1 0-40 17.9-40 40s17.9 40 40 40 40-17.9 40-40" />
              <path d="M100 48c-14.4 0-26 11.6-26 26s11.6 26 26 26 26-11.6 26-26" />
              <path d="M100 62c-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12" />
              <path d="M60 92c12 10 28 18 40 18 18 0 34-8 48-22" />
              <path d="M54 110c16 12 32 18 46 18 20 0 38-10 52-28" />
            </g>
            <circle cx="100" cy="80" r="2" fill="currentColor" opacity="0.9" />
            <circle cx="118" cy="96" r="1.4" fill="white" opacity="0.35" />
            <circle cx="78" cy="108" r="1.2" fill="white" opacity="0.25" />
          </svg>

          {/* Large planet with ring (left/bottom) */}
          <div className="cosmic-planet absolute left-6 bottom-16 w-44 h-44 md:w-56 md:h-56 rounded-full bg-white/5 border border-white/10 overflow-hidden">
            <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
            <div className="absolute inset-0">
              <div className="absolute left-10 top-8 h-2 w-24 rounded-full bg-white/10" />
              <div className="absolute left-8 top-14 h-1 w-28 rounded-full bg-white/10" />
              <div className="absolute left-14 top-24 h-1 w-20 rounded-full bg-white/10" />
            </div>
          </div>
          <div className="cosmic-ring absolute left-0 bottom-24 w-72 md:w-96 h-20 rounded-full border border-white/10 bg-white/5" />

          {/* Small moon (right/top) */}
          <div className="cosmic-moon absolute right-10 top-24 w-16 h-16 rounded-full bg-white/5 border border-white/10">
            <div className="absolute -top-6 -left-6 h-14 w-14 rounded-full bg-white/10 blur-xl" />
          </div>

          {/* Bright elliptical galaxy glow (right/bottom) */}
          <svg
            className="cosmic-galaxy2 absolute -right-24 -bottom-40 w-[560px] h-[560px] text-primary/20"
            viewBox="0 0 200 200"
            fill="none"
          >
            <defs>
              <radialGradient id="g1" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
                <stop
                  offset="55%"
                  stopColor="currentColor"
                  stopOpacity="0.25"
                />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="110" cy="90" rx="70" ry="38" fill="url(#g1)" />
            <ellipse
              cx="96"
              cy="106"
              rx="64"
              ry="30"
              fill="url(#g1)"
              opacity="0.7"
            />
            <circle cx="112" cy="92" r="2" fill="white" opacity="0.35" />
            <circle cx="132" cy="102" r="1.4" fill="white" opacity="0.25" />
            <circle cx="86" cy="86" r="1.2" fill="white" opacity="0.18" />
          </svg>
        </div>

        {/* Warp-speed starfield (spaceship travel) */}
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-44 w-44 rounded-full bg-white/5 blur-2xl" />

          <div className="absolute inset-0 opacity-75">
            {Array.from({ length: 44 }).map((_, i) => {
              const angle = (i * 360) / 44;
              const dist = 520 + (i % 7) * 55;
              const h = 120 + (i % 6) * 28;
              const thickness = i % 9 === 0 ? 2 : 1;
              return (
                <span
                  key={`warp-streak-${i}`}
                  className="warp-streak absolute left-1/2 top-1/2 rounded-full bg-white/40"
                  style={{
                    width: `${thickness}px`,
                    height: `${h}px`,
                    animationDelay: `${(i % 12) * 0.12}s`,
                    animationDuration: `${1.8 + (i % 6) * 0.18}s`,
                    ...({
                      "--a": `${angle}deg`,
                      "--dist": `${dist}px`,
                    } as React.CSSProperties),
                  }}
                />
              );
            })}

            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 360) / 24 + 7;
              const dist = 420 + (i % 5) * 70;
              const size = (i % 3) + 1;
              return (
                <span
                  key={`warp-dot-${i}`}
                  className="warp-dot absolute left-1/2 top-1/2 rounded-full bg-white/80"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    animationDelay: `${(i % 10) * 0.2}s`,
                    animationDuration: `${1.6 + (i % 5) * 0.22}s`,
                    ...({
                      "--a": `${angle}deg`,
                      "--dist": `${dist}px`,
                    } as React.CSSProperties),
                  }}
                />
              );
            })}
          </div>

          {/* Slight vignette for cockpit feel */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-dark/60" />
        </div>
      </div>

      <style>
        {`
          @keyframes nebulaDrift {
            0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.9; }
            50% { transform: translate3d(40px, -30px, 0) scale(1.05); opacity: 1; }
            100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.9; }
          }
          @keyframes cosmicFloat {
            0% { transform: translate3d(0, 0, 0); }
            50% { transform: translate3d(18px, -12px, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
          @keyframes cosmicSpin {
            0% { transform: translate3d(0, 0, 0) rotate(-12deg); }
            50% { transform: translate3d(10px, -6px, 0) rotate(-18deg); }
            100% { transform: translate3d(0, 0, 0) rotate(-12deg); }
          }
          @keyframes galaxyDrift {
            0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0.85; }
            50% { transform: translate3d(16px, -10px, 0) rotate(6deg); opacity: 1; }
            100% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0.85; }
          }
          @keyframes warpStreak {
            0% {
              transform: translate(-50%, -50%) rotate(var(--a)) translateY(0) scaleY(0.15);
              opacity: 0;
            }
            12% { opacity: 0.85; }
            100% {
              transform: translate(-50%, -50%) rotate(var(--a)) translateY(var(--dist)) scaleY(1.2);
              opacity: 0;
            }
          }
          @keyframes warpDot {
            0% {
              transform: translate(-50%, -50%) rotate(var(--a)) translateY(0) scale(0.6);
              opacity: 0;
            }
            15% { opacity: 0.9; }
            100% {
              transform: translate(-50%, -50%) rotate(var(--a)) translateY(var(--dist)) scale(1.35);
              opacity: 0;
            }
          }
          .nebula-blob {
            animation: nebulaDrift 10s ease-in-out infinite;
          }
          .nebula-blob:nth-child(3) {
            animation-duration: 12s;
          }
          .nebula-blob:nth-child(4) {
            animation-duration: 14s;
          }
          .warp-streak {
            transform-origin: 50% 0%;
            animation-name: warpStreak;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform, opacity;
          }
          .warp-dot {
            animation-name: warpDot;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform, opacity;
          }
          .cosmic-planet {
            animation: cosmicFloat 9s ease-in-out infinite;
          }
          .cosmic-moon {
            animation: cosmicFloat 7.5s ease-in-out infinite;
          }
          .cosmic-ring {
            transform: rotate(-14deg);
            animation: cosmicSpin 9.5s ease-in-out infinite;
            filter: blur(0.2px);
          }
          .cosmic-galaxy {
            animation: galaxyDrift 14s ease-in-out infinite;
          }
          .cosmic-galaxy2 {
            animation: galaxyDrift 16s ease-in-out infinite;
            filter: blur(0.2px);
          }
          @media (prefers-reduced-motion: reduce) {
            .nebula-blob, .warp-streak, .warp-dot, .cosmic-planet, .cosmic-moon, .cosmic-ring, .cosmic-galaxy, .cosmic-galaxy2 {
              animation: none !important;
            }
          }
        `}
      </style>

      {/* Hero */}
      <section className="relative px-6 md:px-10 py-16 md:py-24 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div
            className={
              "flex-1 motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out " +
              (mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2")
            }
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                N
              </div>
              <span className="text-white/90 font-semibold">Nebula</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
              Organize tasks. Chat with your team. Move fast.
            </h1>
            <p className="mt-4 text-white/70 text-lg">
              Nebula is a lightweight task board and team chat built for rapid
              collaboration.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="px-6 py-3 bg-primary hover:bg-indigo-600 text-white rounded-lg font-medium inline-flex items-center gap-2 motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dark"
              >
                Get Started <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg font-medium motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-dark"
              >
                Sign In
              </Link>
            </div>
          </div>
          <div
            className={
              "flex-1 motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out motion-safe:delay-150 " +
              (mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2")
            }
          >
            <div className="rounded-2xl border border-white/10 p-6 bg-surface/60 backdrop-blur motion-safe:transition-transform motion-safe:duration-300 hover:-translate-y-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <Kanban className="text-primary" />
                  <div>
                    <p className="font-semibold text-white/90">Task Board</p>
                    <p className="text-sm text-white/70">
                      Drag tasks through stages.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-primary" />
                  <div>
                    <p className="font-semibold text-white/90">Team Chat</p>
                    <p className="text-sm text-white/70">
                      Simple, realtime messaging.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-primary" />
                  <div>
                    <p className="font-semibold text-white/90">
                      Admin Controls
                    </p>
                    <p className="text-sm text-white/70">
                      Manage members & tasks.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Rocket className="text-primary" />
                  <div>
                    <p className="font-semibold text-white/90">Fast Setup</p>
                    <p className="text-sm text-white/70">
                      Start in under a minute.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-10 py-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-sm text-white/50">
            © {year} Nebula. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/your-org/nebula"
                target="_blank"
                rel="noreferrer"
                aria-label="Nebula on GitHub"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 motion-safe:transition-colors"
              >
                <Github size={18} />
              </a>
              <a
                href="https://twitter.com/your_handle"
                target="_blank"
                rel="noreferrer"
                aria-label="Nebula on X"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 motion-safe:transition-colors"
              >
                <Twitter size={18} />
              </a>
              <a
                href="https://www.linkedin.com/company/your-company"
                target="_blank"
                rel="noreferrer"
                aria-label="Nebula on LinkedIn"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 motion-safe:transition-colors"
              >
                <Linkedin size={18} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
