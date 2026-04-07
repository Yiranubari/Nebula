import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useApp } from "./AppContext";

export type CallParticipant = {
  id: string;
  name: string;
  avatar?: string;
  muted: boolean;
  handRaised?: boolean;
};

export type CallState = {
  roomId: string | null;
  isInHuddle: boolean;
  participants: CallParticipant[];
  localStream: MediaStream | null;
  muted: boolean;
  activeRooms?: string[]; // frontend-only hint for UI labels
  inputDevices: MediaDeviceInfo[];
  inputDeviceId?: string;
  outputDevices: MediaDeviceInfo[];
  outputDeviceId?: string;
};

type CallContextType = CallState & {
  joinHuddle: (roomId: string) => Promise<void>;
  leaveHuddle: () => void;
  toggleMute: () => void;
  setInputDeviceId: (deviceId: string) => Promise<void>;
  raiseHand: () => void;
  setOutputDeviceId: (deviceId: string) => Promise<void>;
};

const CallContext = createContext<CallContextType | null>(null);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useApp();
  const [state, setState] = useState<CallState>({
    roomId: null,
    isInHuddle: false,
    participants: [],
    localStream: null,
    muted: false,
    activeRooms: [],
    inputDevices: [],
    outputDevices: [],
  });
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const enumerateInputDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === "audioinput");
      const outputs = devices.filter((d) => d.kind === "audiooutput");
      setState((prev) => ({
        ...prev,
        inputDevices: inputs,
        outputDevices: outputs,
      }));
    } catch {}
  };

  useEffect(() => {
    // Create a hidden audio element to play local stream when unmuted (for debug if needed)
    const el = document.createElement("audio");
    el.style.display = "none";
    el.autoplay = true;
    document.body.appendChild(el);
    localAudioRef.current = el;
    try {
      audioCtxRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch {}

    const onDeviceChange = () => enumerateInputDevices();
    if (navigator.mediaDevices && "ondevicechange" in navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
    }
    return () => {
      try {
        document.body.removeChild(el);
      } catch {}
      localAudioRef.current = null;
      try {
        navigator.mediaDevices.removeEventListener(
          "devicechange",
          onDeviceChange
        );
      } catch {}
      try {
        audioCtxRef.current?.close();
      } catch {}
    };
  }, []);

  const playJoinChime = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880; // A5
      g.gain.value = 0.001; // quiet
      o.connect(g).connect(ctx.destination);
      const now = ctx.currentTime;
      o.start(now);
      // quick up/down envelope
      g.gain.exponentialRampToValueAtTime(0.02, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      o.stop(now + 0.3);
    } catch {}
  };

  const joinHuddle = async (roomId: string) => {
    if (state.isInHuddle && state.roomId === roomId) return;
    try {
      const constraints: MediaStreamConstraints = {
        audio: state.inputDeviceId
          ? { deviceId: { exact: state.inputDeviceId } }
          : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (localAudioRef.current) localAudioRef.current.srcObject = stream;
      setState((prev) => ({
        ...prev,
        roomId,
        isInHuddle: true,
        localStream: stream,
        muted: false,
        participants: [
          {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            muted: false,
          },
        ],
        activeRooms: Array.from(new Set([...(prev.activeRooms || []), roomId])),
      }));
      playJoinChime();
      // populate devices after permission granted
      await enumerateInputDevices();
      try {
        const key = "nebula.huddleActiveRooms";
        const current = JSON.parse(localStorage.getItem(key) || "[]");
        const next = Array.from(new Set([...(current || []), roomId]));
        localStorage.setItem(key, JSON.stringify(next));
        // Update presence localStorage to reflect in-huddle state
        const presKey = "nebula.presence.v1";
        const presRaw = localStorage.getItem(presKey);
        const pres = presRaw ? JSON.parse(presRaw) : {};
        const now = new Date().toISOString();
        pres[currentUser.id] = {
          status: "online",
          lastActive: now,
          inHuddleTrackId: roomId,
        };
        localStorage.setItem(presKey, JSON.stringify(pres));
      } catch {}
      // NOTE: Backend signaling should broadcast join to others and add remote peers.
    } catch (err) {
      console.error("Huddle: Failed to get microphone", err);
      setState((prev) => ({ ...prev, roomId: null, isInHuddle: false }));
    }
  };

  const leaveHuddle = () => {
    try {
      state.localStream?.getTracks().forEach((t) => t.stop());
    } catch {}
    setState((prev) => ({
      roomId: null,
      isInHuddle: false,
      participants: [],
      localStream: null,
      muted: false,
      activeRooms: (prev.activeRooms || []).filter((id) => id !== prev.roomId),
    }));
    try {
      const key = "nebula.huddleActiveRooms";
      const current = JSON.parse(localStorage.getItem(key) || "[]");
      const next = (current || []).filter((id: string) => id !== state.roomId);
      localStorage.setItem(key, JSON.stringify(next));
      // Update presence localStorage to clear in-huddle state
      const presKey = "nebula.presence.v1";
      const presRaw = localStorage.getItem(presKey);
      const pres = presRaw ? JSON.parse(presRaw) : {};
      const now = new Date().toISOString();
      pres[currentUser.id] = {
        status: "online",
        lastActive: now,
        inHuddleTrackId: null,
      };
      localStorage.setItem(presKey, JSON.stringify(pres));
    } catch {}
  };

  const toggleMute = () => {
    const mutedNext = !state.muted;
    state.localStream
      ?.getAudioTracks()
      .forEach((t) => (t.enabled = !mutedNext));
    setState((prev) => ({
      ...prev,
      muted: mutedNext,
      participants: prev.participants.map((p) =>
        p.id === currentUser.id ? { ...p, muted: mutedNext } : p
      ),
    }));
    // TODO: Backend should inform others about mute changes.
  };

  const setInputDeviceId = async (deviceId: string) => {
    setState((prev) => ({ ...prev, inputDeviceId: deviceId }));
    if (!state.isInHuddle) return;
    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      // stop previous tracks
      try {
        state.localStream?.getTracks().forEach((t) => t.stop());
      } catch {}
      if (localAudioRef.current) localAudioRef.current.srcObject = newStream;
      setState((prev) => ({ ...prev, localStream: newStream }));
    } catch (err) {
      console.error("Failed to switch input device", err);
    }
  };

  const raiseHand = () => {
    setState((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.id === currentUser.id ? { ...p, handRaised: !p.handRaised } : p
      ),
    }));
    // TODO: In a real app, broadcast this to peers via signaling.
  };

  const setOutputDeviceId = async (deviceId: string) => {
    setState((prev) => ({ ...prev, outputDeviceId: deviceId }));
    try {
      const el = localAudioRef.current as any;
      if (el && typeof el.setSinkId === "function") {
        await el.setSinkId(deviceId || "default");
      }
    } catch (err) {
      console.warn("Setting output device not supported in this browser", err);
    }
  };

  const value: CallContextType = {
    ...state,
    joinHuddle,
    leaveHuddle,
    toggleMute,
    setInputDeviceId,
    raiseHand,
    setOutputDeviceId,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
};
