import React, { useEffect, useMemo, useRef } from "react";
import {
  Hand,
  Mic,
  MicOff,
  ScreenShare,
  ScreenShareOff,
  Volume2,
  X,
  PhoneOff,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useCall } from "../context/CallContext";
import Avatar from "./Avatar";

export default function HuddleCall({
  trackId,
  trackName,
  onClose,
}: {
  trackId: string;
  trackName: string;
  onClose: () => void;
}) {
  const { users, currentUser } = useApp();
  const {
    roomId,
    isInHuddle,
    participants,
    muted,
    inputDevices,
    outputDevices,
    inputDeviceId,
    outputDeviceId,
    handRaised,
    joinHuddle,
    leaveHuddle,
    toggleMute,
    setInputDeviceId,
    setOutputDeviceId,
    toggleHand,
    toggleScreenShare,
    localScreenStream,
    remoteScreenStreams,
    isScreenSharing,
    activeScreenSharerId,
  } = useCall();

  useEffect(() => {
    void joinHuddle(trackId);
    return () => {
      try {
        leaveHuddle();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  const handleClose = () => {
    try {
      if (isInHuddle) leaveHuddle();
    } catch {}
    onClose();
  };

  // Which stream is showing in the main viewer
  const activeScreenStream: MediaStream | null = useMemo(() => {
    if (!activeScreenSharerId) return null;
    if (activeScreenSharerId === currentUser.id) return localScreenStream;
    return remoteScreenStreams[activeScreenSharerId] ?? null;
  }, [activeScreenSharerId, currentUser.id, localScreenStream, remoteScreenStreams]);

  const sharerName = useMemo(() => {
    if (!activeScreenSharerId) return null;
    if (activeScreenSharerId === currentUser.id) return "You";
    const u = users.find((u) => u.id === activeScreenSharerId);
    return u?.name ?? "A teammate";
  }, [activeScreenSharerId, currentUser.id, users]);

  // Bind the active stream to the <video> element whenever it changes.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = activeScreenStream;
  }, [activeScreenStream]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full md:max-w-3xl bg-[#0f172a] text-slate-100 rounded-t-2xl md:rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/30 border border-white/10">
              <span className="text-sm font-bold text-white">#</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm md:text-base font-semibold tracking-tight truncate">
                Huddle · #{trackName}
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                {participants.length === 1
                  ? "Waiting for teammates…"
                  : `${participants.length} in call`}
              </p>
            </div>
          </div>
          <button
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Screen-share stage (only when active) */}
        {activeScreenStream && (
          <div className="px-5 pt-4">
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={activeScreenSharerId === currentUser.id}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-black/50 backdrop-blur text-white border border-white/15">
                <ScreenShare size={12} />
                {sharerName} sharing
              </div>
            </div>
          </div>
        )}

        {/* Participant grid */}
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {participants.map((p) => {
              const fallbackAvatar = users.find((u) => u.id === p.id)?.avatar;
              const isSelf = p.id === currentUser.id;
              return (
                <div
                  key={p.id}
                  className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors"
                >
                  <div className="relative">
                    <Avatar
                      src={p.avatar || fallbackAvatar}
                      name={p.name}
                      size="xl"
                      className={`ring-2 ring-offset-2 ring-offset-[#0f172a] ${
                        p.muted ? "ring-red-500/60" : "ring-emerald-500/60"
                      }`}
                    />
                    {p.handRaised && (
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-2 border-[#0f172a] flex items-center justify-center shadow">
                        <Hand size={12} className="text-amber-900" />
                      </span>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium truncate max-w-[10rem]">
                      {p.name}
                      {isSelf && <span className="text-slate-500"> (you)</span>}
                    </p>
                    <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                      {p.muted ? (
                        <>
                          <MicOff size={10} /> Muted
                        </>
                      ) : (
                        <>
                          <Mic size={10} /> Speaking
                        </>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Control bar */}
        <div className="px-5 pb-5 pt-2 border-t border-white/10 bg-white/[0.02]">
          {/* Device selectors row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <DeviceSelect
              icon={<Mic size={14} />}
              label="Microphone"
              value={inputDeviceId ?? ""}
              devices={inputDevices}
              defaultLabel="System default"
              onChange={(v) => void setInputDeviceId(v)}
            />
            <DeviceSelect
              icon={<Volume2 size={14} />}
              label="Speaker"
              value={outputDeviceId ?? ""}
              devices={outputDevices}
              defaultLabel="System default"
              onChange={(v) => void setOutputDeviceId(v)}
            />
          </div>

          {/* Action row */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <CallButton
              active={muted}
              onClick={toggleMute}
              icon={muted ? <MicOff size={16} /> : <Mic size={16} />}
              label={muted ? "Unmute" : "Mute"}
              activeTone="red"
            />
            <CallButton
              active={handRaised}
              onClick={toggleHand}
              icon={<Hand size={16} />}
              label={handRaised ? "Lower hand" : "Raise hand"}
              activeTone="amber"
            />
            <CallButton
              active={!!localScreenStream}
              onClick={() => void toggleScreenShare()}
              icon={
                localScreenStream ? (
                  <ScreenShareOff size={16} />
                ) : (
                  <ScreenShare size={16} />
                )
              }
              label={localScreenStream ? "Stop sharing" : "Share screen"}
              activeTone="indigo"
              disabled={isScreenSharing && !localScreenStream}
              title={
                isScreenSharing && !localScreenStream
                  ? `${sharerName} is currently sharing — wait for them to stop`
                  : undefined
              }
            />
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-lg shadow-red-500/30"
              onClick={handleClose}
            >
              <PhoneOff size={16} />
              Leave
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-500">
            Room: {roomId || trackId}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Local helpers ──────────────────────────────────────────────────────────

function CallButton({
  active,
  onClick,
  icon,
  label,
  activeTone,
  disabled,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeTone: "red" | "amber" | "indigo";
  disabled?: boolean;
  title?: string;
}) {
  const toneActive = {
    red: "bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-red-500/30",
    amber: "bg-amber-500 hover:bg-amber-600 text-amber-950 border-amber-600 shadow-amber-400/40",
    indigo: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-indigo-500/40",
  }[activeTone];
  const idle =
    "bg-white/5 hover:bg-white/10 text-white border-white/10 shadow-black/20";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium shadow-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? toneActive : idle
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DeviceSelect({
  icon,
  label,
  value,
  devices,
  defaultLabel,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  devices: MediaDeviceInfo[];
  defaultLabel: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="group relative flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-indigo-500/50 transition-colors">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold shrink-0">
        {label}
      </span>
      <select
        className="flex-1 min-w-0 appearance-none bg-transparent outline-none text-xs text-slate-100 pr-6 truncate cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        <option value="" className="bg-[#0f172a]">
          {defaultLabel}
        </option>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId} className="bg-[#0f172a]">
            {d.label || `${label} ${d.deviceId.slice(0, 6)}`}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        width="10"
        height="10"
        viewBox="0 0 12 8"
        fill="none"
      >
        <path
          d="M1 1l5 5 5-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </label>
  );
}
