import React, { useEffect } from "react";
import {
  ChevronDown,
  Hand,
  Mic,
  MicOff,
  ScreenShare,
  Users,
  Volume2,
  X,
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
  const { users } = useApp();
  const {
    roomId,
    isInHuddle,
    participants,
    muted,
    inputDevices,
    outputDevices,
    joinHuddle,
    leaveHuddle,
    toggleMute,
    setInputDeviceId,
    setOutputDeviceId,
    raiseHand,
  } = useCall();

  useEffect(() => {
    void joinHuddle(trackId);
    return () => {
      // Defensive cleanup if the modal unmounts.
      try {
        leaveHuddle();
      } catch {}
    };
  }, [joinHuddle, leaveHuddle, trackId]);

  const handleClose = () => {
    try {
      if (isInHuddle) leaveHuddle();
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full md:max-w-2xl bg-white dark:bg-surface rounded-t-2xl md:rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              #
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100">
                Huddle • #{trackName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Room: {roomId || trackId}
              </p>
            </div>
          </div>
          <button
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            <Users size={14} /> {participants.length} in call
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {participants.length === 1
              ? "Waiting for teammates to join…"
              : "Connected"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {participants.map((p) => {
            const fallbackAvatar = users.find((u) => u.id === p.id)?.avatar;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark"
              >
                <Avatar
                  src={p.avatar || fallbackAvatar}
                  name={p.name}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {p.muted ? "Muted" : "Speaking"}
                  </p>
                </div>
                {p.handRaised ? (
                  <Hand
                    size={16}
                    className="text-indigo-600"
                    title="Raised hand"
                  />
                ) : null}
                {p.muted ? (
                  <MicOff size={16} className="text-slate-500" />
                ) : (
                  <Mic size={16} className="text-slate-500" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2">
          <div className="relative inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-surface text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
            <Mic size={14} className="text-slate-600 dark:text-slate-300" />
            <select
              className="appearance-none bg-transparent outline-none text-slate-800 dark:text-slate-100 pr-6"
              onChange={(e) => void setInputDeviceId(e.target.value)}
              title="Microphone input"
              aria-label="Microphone input"
              defaultValue=""
            >
              <option value="">Default mic</option>
              {(inputDevices || []).map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2 pointer-events-none text-slate-500 dark:text-slate-400"
            />
          </div>

          <div className="relative inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-surface text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
            <Volume2 size={14} className="text-slate-600 dark:text-slate-300" />
            <select
              className="appearance-none bg-transparent outline-none text-slate-800 dark:text-slate-100 pr-6"
              onChange={(e) => void setOutputDeviceId(e.target.value)}
              title="Speaker output"
              aria-label="Speaker output"
              defaultValue=""
            >
              <option value="">Default speaker</option>
              {(outputDevices || []).map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Spk ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2 pointer-events-none text-slate-500 dark:text-slate-400"
            />
          </div>

          <button
            className={`px-4 py-2 rounded-full border inline-flex items-center gap-2 ${
              muted
                ? "bg-red-600 text-white border-red-700 hover:bg-red-700"
                : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
            onClick={toggleMute}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff size={16} /> : <Mic size={16} />}{" "}
            {muted ? "Unmute" : "Mute"}
          </button>

          <button
            className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center gap-2"
            onClick={raiseHand}
            title="Raise hand"
          >
            <Hand size={16} /> Raise hand
          </button>

          <button
            className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center gap-2 disabled:opacity-60"
            disabled
            title="Screen share requires backend signaling"
          >
            <ScreenShare size={16} /> Share screen
          </button>

          <button
            className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700"
            onClick={handleClose}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
