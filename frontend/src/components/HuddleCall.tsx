import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Hand,
  Mic,
  MicOff,
  ScreenShare,
  ScreenShareOff,
  PhoneOff,
  Users,
  Settings,
  Volume2,
  Video,
  VideoOff,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useCall } from "../context/CallContext";
import Avatar from "./Avatar";
import Select from "./Select";

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
    toggleCamera,
    cameraOn,
    localCameraStream,
    remoteCameraStreams,
  } = useCall();

  useEffect(() => {
    void joinHuddle(trackId);
    return () => {
      try {
        leaveHuddle();
      } catch {}
    };
  }, [trackId]);

  const handleClose = () => {
    try {
      if (isInHuddle) leaveHuddle();
    } catch {}
    onClose();
  };

  const startedAt = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState("00:00");
  useEffect(() => {
    const id = window.setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt.current) / 1000);
      const hh = Math.floor(secs / 3600);
      const mm = Math.floor((secs % 3600) / 60);
      const ss = secs % 60;
      const pad = (n: number) => String(n).padStart(2, "0");
      setElapsed(hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

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

  const iAmSharing = activeScreenSharerId === currentUser.id;
  const presenting = !!activeScreenStream;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = activeScreenStream;
  }, [activeScreenStream]);

  const raisedHands = useMemo(
    () => participants.filter((p) => p.handRaised),
    [participants]
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!settingsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [settingsOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const gridCols = useMemo(() => {
    const n = participants.length;
    if (n <= 1) return "grid-cols-1";
    if (n <= 2) return "grid-cols-1 sm:grid-cols-2";
    if (n <= 4) return "grid-cols-2";
    if (n <= 9) return "grid-cols-2 sm:grid-cols-3";
    return "grid-cols-3 sm:grid-cols-4";
  }, [participants.length]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0e1a] text-slate-100">
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/30 text-white font-bold text-sm">
            #
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight truncate">
              #{trackName}
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                Live
              </span>
              <span>·</span>
              <span className="tabular-nums">{elapsed}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Users size={11} />
                {participants.length}
              </span>
            </div>
          </div>
        </div>

        {raisedHands.length > 0 && (
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-200 text-xs">
            <Hand size={12} />
            <span className="font-medium">
              {raisedHands
                .slice(0, 2)
                .map((p) =>
                  p.id === currentUser.id ? "You" : p.name.split(" ")[0]
                )
                .join(", ")}
              {raisedHands.length > 2 && ` +${raisedHands.length - 2}`}
            </span>
          </div>
        )}
      </header>

      <main className="flex-1 min-h-0 overflow-hidden px-3 md:px-6 py-4">
        {presenting ? (
          <div className="h-full flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 rounded-2xl overflow-hidden bg-black border border-white/5">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={iAmSharing}
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-black/60 backdrop-blur text-white border border-white/15">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                {iAmSharing ? "You're presenting" : `${sharerName} is presenting`}
              </div>
              {iAmSharing && (
                <button
                  onClick={() => void toggleScreenShare()}
                  className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium shadow"
                >
                  <ScreenShareOff size={12} />
                  Stop presenting
                </button>
              )}
            </div>

            <div className="flex lg:flex-col gap-2 overflow-auto lg:w-48 shrink-0">
              {participants.map((p) => (
                <ParticipantTile
                  key={p.id}
                  participant={p}
                  users={users}
                  selfId={currentUser.id}
                  compact
                  isSharer={p.id === activeScreenSharerId}
                  videoStream={
                    p.id === currentUser.id
                      ? localCameraStream
                      : remoteCameraStreams[p.id] ?? null
                  }
                />
              ))}
            </div>
          </div>
        ) : (
          <div className={`h-full grid gap-3 auto-rows-fr ${gridCols}`}>
            {participants.map((p) => (
              <ParticipantTile
                key={p.id}
                participant={p}
                users={users}
                selfId={currentUser.id}
                isSharer={false}
                videoStream={
                  p.id === currentUser.id
                    ? localCameraStream
                    : remoteCameraStreams[p.id] ?? null
                }
              />
            ))}
          </div>
        )}

        {participants.length === 1 && !presenting && (
          <p className="mt-4 text-center text-sm text-slate-500">
            You're the only one here. Share the track to invite teammates.
          </p>
        )}
      </main>

      <footer className="relative flex items-center justify-center px-3 md:px-6 pt-2 pb-4">
        {settingsOpen && (
          <div
            ref={settingsRef}
            className="absolute bottom-[calc(100%-8px)] left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 w-[90vw] max-w-sm rounded-2xl bg-[#141b2e] border border-white/10 shadow-2xl p-4 z-10"
          >
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
              Audio devices
            </p>
            <div className="space-y-2">
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
          </div>
        )}

        <div className="inline-flex items-center gap-2 rounded-full bg-[#141b2e] border border-white/10 px-2 py-2 shadow-2xl backdrop-blur">
          <IconButton
            active={muted}
            onClick={toggleMute}
            icon={muted ? <MicOff size={18} /> : <Mic size={18} />}
            label={muted ? "Unmute" : "Mute"}
            activeTone="red"
          />
          <IconButton
            active={!cameraOn}
            onClick={() => void toggleCamera()}
            icon={cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
            label={cameraOn ? "Turn off camera" : "Turn on camera"}
            activeTone="red"
          />
          <IconButton
            active={handRaised}
            onClick={toggleHand}
            icon={<Hand size={18} />}
            label={handRaised ? "Lower hand" : "Raise hand"}
            activeTone="amber"
          />
          <IconButton
            active={!!localScreenStream}
            onClick={() => void toggleScreenShare()}
            icon={
              localScreenStream ? (
                <ScreenShareOff size={18} />
              ) : (
                <ScreenShare size={18} />
              )
            }
            label={
              localScreenStream
                ? "Stop sharing"
                : isScreenSharing
                ? `${sharerName} is presenting`
                : "Share screen"
            }
            activeTone="indigo"
            disabled={isScreenSharing && !localScreenStream}
          />
          <IconButton
            active={settingsOpen}
            onClick={() => setSettingsOpen((v) => !v)}
            icon={<Settings size={18} />}
            label="Settings"
            activeTone="indigo"
          />
          <div className="w-px h-8 bg-white/10 mx-1" />
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-lg shadow-red-500/30"
            aria-label="Leave call"
            title="Leave call"
          >
            <PhoneOff size={16} />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

type TileParticipant = {
  id: string;
  name: string;
  avatar?: string;
  muted: boolean;
  handRaised?: boolean;
};

const ParticipantTile: React.FC<{
  participant: TileParticipant;
  users: { id: string; avatar?: string }[];
  selfId: string;
  compact?: boolean;
  isSharer: boolean;
  videoStream?: MediaStream | null;
}> = ({ participant: p, users, selfId, compact, isSharer, videoStream }) => {
  const fallbackAvatar = users.find((u) => u.id === p.id)?.avatar;
  const isSelf = p.id === selfId;
  const avatarSize = compact ? "lg" : "xl";
  const hasVideo = !!videoStream;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = videoStream ?? null;
    }
  }, [videoStream]);

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden bg-[#141b2e] border transition-colors flex items-center justify-center ${
        isSharer
          ? "border-red-500/50"
          : p.muted
          ? "border-white/5"
          : "border-emerald-500/30"
      } ${compact ? "h-28 lg:h-28" : "min-h-[12rem]"}`}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className={`absolute inset-0 w-full h-full object-cover bg-black ${
            isSelf ? "-scale-x-100" : ""
          }`}
        />
      ) : (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 60%)",
            }}
          />
          <div className="flex flex-col items-center gap-2 px-3">
            <Avatar
              src={p.avatar || fallbackAvatar}
              name={p.name}
              size={avatarSize as any}
              className={`ring-2 ring-offset-2 ring-offset-[#141b2e] ${
                p.muted ? "ring-white/10" : "ring-emerald-500/50"
              }`}
            />
          </div>
        </>
      )}

      {p.handRaised && (
        <span
          className={`absolute ${
            compact ? "top-1.5 right-1.5 w-6 h-6" : "top-3 right-3 w-9 h-9"
          } rounded-full bg-amber-400 border-2 border-[#0a0e1a] flex items-center justify-center shadow-lg shadow-amber-500/40 z-10`}
        >
          <Hand size={compact ? 12 : 16} className="text-amber-900" />
        </span>
      )}

      <div
        className={`absolute ${
          compact ? "bottom-1.5 left-1.5" : "bottom-3 left-3"
        } inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/55 backdrop-blur text-xs z-10`}
      >
        {p.muted ? (
          <MicOff size={12} className="text-red-400" />
        ) : (
          <Mic size={12} className="text-emerald-400" />
        )}
        <span className="max-w-[8rem] truncate">
          {isSelf ? "You" : p.name}
        </span>
      </div>

      {isSharer && (
        <div
          className={`absolute ${
            compact ? "top-1.5 left-1.5 text-[9px]" : "top-3 left-3 text-[10px]"
          } inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-200 font-medium z-10`}
        >
          <ScreenShare size={compact ? 10 : 11} />
          Presenting
        </div>
      )}
    </div>
  );
};

function IconButton({
  active,
  onClick,
  icon,
  label,
  activeTone,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeTone: "red" | "amber" | "indigo";
  disabled?: boolean;
}) {
  const toneActive = {
    red: "bg-red-600 hover:bg-red-700 text-white",
    amber: "bg-amber-500 hover:bg-amber-600 text-amber-950",
    indigo: "bg-indigo-600 hover:bg-indigo-700 text-white",
  }[activeTone];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`relative h-11 w-11 inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? toneActive : "bg-white/5 hover:bg-white/10 text-white"
      }`}
    >
      {icon}
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
    <div>
      <label className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1.5 mb-1">
        {icon}
        {label}
      </label>
      <Select<string>
        value={value}
        onChange={onChange}
        placeholder={defaultLabel}
        className="w-full justify-between"
        ariaLabel={label}
        options={[
          { value: "", label: defaultLabel },
          ...devices.map((d) => ({
            value: d.deviceId,
            label: d.label || `${label} ${d.deviceId.slice(0, 6)}`,
          })),
        ]}
      />
    </div>
  );
}
