import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Rocket,
  ShieldCheck,
  MessageSquare,
  Kanban,
  ArrowRight,
  Zap,
  Globe,
  Layers,
} from "lucide-react";

const Landing = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 30);
    return () => window.clearTimeout(t);
  }, []);

  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-900 selection:bg-indigo-500/30 text-white font-sans">
      {/* Background gradients and blurs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[150px]" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-pink-500/10 blur-[100px]" />
        
        {/* Animated grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 group">
          <img
            src="/logo.svg"
            alt="Nebula"
            className="w-10 h-10 drop-shadow-[0_0_14px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform duration-300"
          />
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Nebula</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-white hover:text-indigo-300 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/10 rounded-full backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-24 pb-32 px-6 text-center">
        <div className={`transition-all duration-1000 ease-out flex flex-col items-center ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/60 max-w-4xl leading-[1.1] mb-6">
            The workspace for <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">visionary teams</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed font-light">
            Unify your tasks, documents, and team chat in a single, beautiful space. 
            Designed to help you move incredibly fast and stay in flow.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              to="/signup"
              className="group relative px-8 py-4 bg-white text-slate-900 rounded-full font-bold shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
            >
              Start for free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-full font-medium border border-white/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Globe size={18} className="text-slate-400" />
              Explore features
            </a>
          </div>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className={`mt-24 relative w-full max-w-5xl transition-all duration-1000 delay-300 ease-out ${mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-16 scale-95"}`}>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none" />
          <div className="relative rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-2xl overflow-hidden shadow-indigo-500/20">
            {/* Mac OS Controls */}
            <div className="absolute top-0 left-0 w-full h-12 bg-slate-800/50 border-b border-white/5 flex items-center px-4 gap-2 z-20">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            
            {/* Mockup content */}
            <div className="pt-12 flex h-[400px]">
              <div className="w-48 border-r border-white/5 p-4 flex flex-col gap-3 opacity-70">
                <div className="h-4 w-24 bg-white/10 rounded mb-4" />
                <div className="h-8 w-full bg-white/5 rounded-md flex items-center px-2 gap-2"><div className="w-4 h-4 rounded bg-indigo-500/50"/> <div className="h-2 w-16 bg-white/20 rounded"/></div>
                <div className="h-8 w-full bg-white/5 rounded-md flex items-center px-2 gap-2"><div className="w-4 h-4 rounded bg-purple-500/50"/> <div className="h-2 w-12 bg-white/20 rounded"/></div>
                <div className="h-8 w-full bg-white/5 rounded-md flex items-center px-2 gap-2"><div className="w-4 h-4 rounded bg-pink-500/50"/> <div className="h-2 w-20 bg-white/20 rounded"/></div>
              </div>
              <div className="flex-1 p-6 relative">
                <div className="flex justify-between mb-6">
                  <div className="h-6 w-48 bg-white/10 rounded" />
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                  </div>
                </div>
                
                <div className="flex gap-4 h-full">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex-1 bg-white/5 rounded-xl p-3 flex flex-col gap-3">
                      <div className="h-4 w-20 bg-white/10 rounded mb-2" />
                      <div className="h-24 w-full bg-white/5 rounded-lg border border-white/5 p-3 flex flex-col justify-between">
                         <div className="h-3 w-3/4 bg-white/10 rounded" />
                         <div className="flex justify-between items-center mt-4">
                           <div className="w-5 h-5 rounded-full bg-indigo-500/50" />
                           <div className="h-2 w-8 bg-white/10 rounded" />
                         </div>
                      </div>
                      {i !== 3 && <div className="h-24 w-full bg-white/5 rounded-lg border border-white/5 p-3 flex flex-col justify-between">
                         <div className="h-3 w-1/2 bg-white/10 rounded" />
                         <div className="flex justify-between items-center mt-4">
                           <div className="w-5 h-5 rounded-full bg-rose-500/50" />
                           <div className="h-2 w-8 bg-white/10 rounded" />
                         </div>
                      </div>}
                    </div>
                  ))}
                </div>
                
                <div className="absolute bottom-6 right-6 w-64 h-72 bg-slate-800/90 rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl">
                  <div className="p-3 border-b border-white/5 flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500" />
                     <div className="h-3 w-20 bg-white/20 rounded" />
                  </div>
                  <div className="flex-1 p-3 flex flex-col gap-3 justify-end">
                     <div className="self-start px-3 py-2 bg-white/5 rounded-2xl rounded-tl-sm w-3/4"><div className="h-2 w-full bg-white/20 rounded mb-1"/><div className="h-2 w-1/2 bg-white/20 rounded"/></div>
                     <div className="self-end px-3 py-2 bg-indigo-500/20 text-white rounded-2xl rounded-tr-sm w-2/3"><div className="h-2 w-full bg-indigo-200/50 rounded mb-1"/><div className="h-2 w-2/3 bg-indigo-200/50 rounded"/></div>
                  </div>
                  <div className="p-2 border-t border-white/5">
                     <div className="h-8 w-full bg-white/5 rounded-full" />
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section id="features" className="relative z-10 py-24 px-6 max-w-6xl mx-auto border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-4">
            Everything you need. Nothing you don't.
          </h2>
          <p className="text-slate-400 font-light max-w-2xl mx-auto">
            We stripped away the clutter of traditional project management tools to give you a lighting-fast experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Kanban, title: "Intuitive Boards", desc: "Drag, drop, and manage tasks with zero friction. Custom workflows that adapt to your team.", color: "text-indigo-400", bg: "bg-indigo-500/10" },
            { icon: MessageSquare, title: "Realtime Chat", desc: "Built-in messaging right next to your work. Never switch contexts to ask a quick question.", color: "text-purple-400", bg: "bg-purple-500/10" },
            { icon: Zap, title: "Lightning Fast", desc: "Engineered for speed. Instant updates and optimistic UI.", color: "text-amber-400", bg: "bg-amber-500/10" },
            { icon: Layers, title: "Powerful Sorting", desc: "Find exactly what you need with advanced filtering, labels, and smart search.", color: "text-pink-400", bg: "bg-pink-500/10" },
            { icon: ShieldCheck, title: "Granular Access", desc: "Enterprise-grade security and permissions to keep your data safe and sound.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { icon: Rocket, title: "Instant Setup", desc: "Go from signup to your first productive workflow in under 60 seconds.", color: "text-rose-400", bg: "bg-rose-500/10" },
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity duration-500 text-white">
                 <feature.icon className="w-32 h-32 transform translate-x-8 -translate-y-8" />
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm border border-white/5 ${feature.bg} ${feature.color}`}>
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-900/20" />
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 p-10 md:p-16 text-center relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/30 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/30 rounded-full blur-[80px]" />
          
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10">
            Ready to accelerate your team?
          </h2>
          <p className="text-slate-300 text-base md:text-xl mb-10 max-w-2xl mx-auto relative z-10 font-light">
            Join thousands of modern teams building the future with Nebula.
            No credit card required.
          </p>
          <div className="flex justify-center relative z-10">
            <Link
              to="/signup"
              className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6 bg-slate-950">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
             <img
               src="/logo.svg"
               alt="Nebula"
               className="w-8 h-8 drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]"
             />
             <span className="text-lg font-semibold text-white/90">Nebula</span>
          </div>
          <p className="text-sm text-slate-500 font-light">
            © {year} Nebula platform. All rights reserved. Built for the modern team.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
