
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import SimplePeer from "simple-peer";
import toast from "react-hot-toast";
import { useApp } from "./AppContext";
import { useSocket } from "./SocketContext";

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
  activeRooms: string[];
  inputDevices: MediaDeviceInfo[];
  inputDeviceId?: string;
  outputDevices: MediaDeviceInfo[];
  outputDeviceId?: string;
  localScreenStream: MediaStream | null;
  remoteScreenStreams: Record<string, MediaStream>;
  isScreenSharing: boolean;
  activeScreenSharerId: string | null;
  handRaised: boolean;
  localCameraStream: MediaStream | null;
  cameraOn: boolean;
  remoteCameraStreams: Record<string, MediaStream>;
};

type CallContextType = CallState & {
  joinHuddle: (roomId: string) => Promise<void>;
  leaveHuddle: () => void;
  toggleMute: () => void;
  setInputDeviceId: (deviceId: string) => Promise<void>;
  toggleHand: () => void;
  raiseHand: () => void;
  setOutputDeviceId: (deviceId: string) => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  toggleCamera: () => Promise<void>;
};

type PeerEntry = {
  userId: string;
  peer: SimplePeer.Instance;
  audioEl: HTMLAudioElement;
};

const CallContext = createContext<CallContextType | null>(null);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, users, setUserPresence } = useApp();
  const { socket } = useSocket();

  const [state, setState] = useState<CallState>({
    roomId: null,
    isInHuddle: false,
    participants: [],
    localStream: null,
    muted: false,
    activeRooms: [],
    inputDevices: [],
    outputDevices: [],
    localScreenStream: null,
    remoteScreenStreams: {},
    isScreenSharing: false,
    activeScreenSharerId: null,
    handRaised: false,
    localCameraStream: null,
    cameraOn: false,
    remoteCameraStreams: {},
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const el = document.createElement("audio");
    el.style.display = "none";
    el.autoplay = true;
    el.muted = true;
    document.body.appendChild(el);
    localAudioRef.current = el;

    try {
      audioCtxRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch {}

    const onDeviceChange = () => enumerateDevices();
    navigator.mediaDevices?.addEventListener("devicechange", onDeviceChange);

    return () => {
      try { document.body.removeChild(el); } catch {}
      localAudioRef.current = null;
      navigator.mediaDevices?.removeEventListener("devicechange", onDeviceChange);
      audioCtxRef.current?.close();
    };
  }, []);

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setState((prev) => ({
        ...prev,
        inputDevices: devices.filter((d) => d.kind === "audioinput"),
        outputDevices: devices.filter((d) => d.kind === "audiooutput"),
      }));
    } catch {}
  };

  const playJoinChime = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.001;
      o.connect(g).connect(ctx.destination);
      const now = ctx.currentTime;
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.02, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      o.stop(now + 0.3);
    } catch {}
  };

  const destroyPeer = (userId: string) => {
    const entry = peersRef.current.get(userId);
    if (!entry) return;
    try { entry.peer.destroy(); } catch {}
    try { entry.audioEl.pause(); entry.audioEl.srcObject = null; document.body.removeChild(entry.audioEl); } catch {}
    peersRef.current.delete(userId);
  };

  const destroyAllPeers = () => {
    for (const userId of peersRef.current.keys()) destroyPeer(userId);
  };

  const createPeer = (
    remoteUserId: string,
    localStream: MediaStream,
    initiator: boolean
  ): SimplePeer.Instance => {
    destroyPeer(remoteUserId);

    const peer = new SimplePeer({
      initiator,
      stream: localStream,
      trickle: true,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });

    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    audioEl.style.display = "none";
    document.body.appendChild(audioEl);

    const outputDeviceId = stateRef.current.outputDeviceId;
    if (outputDeviceId && typeof (audioEl as any).setSinkId === "function") {
      (audioEl as any).setSinkId(outputDeviceId).catch(() => {});
    }

    peersRef.current.set(remoteUserId, { userId: remoteUserId, peer, audioEl });

    peer.on("signal", (data) => {
      const roomId = stateRef.current.roomId;
      if (!socket || !roomId) return;

      if (data.type === "offer") {
        socket.emit("huddle:offer", { roomId, toUserId: remoteUserId, sdp: data as RTCSessionDescriptionInit });
      } else if (data.type === "answer") {
        socket.emit("huddle:answer", { roomId, toUserId: remoteUserId, sdp: data as RTCSessionDescriptionInit });
      } else {
        socket.emit("huddle:ice", { roomId, toUserId: remoteUserId, candidate: data as RTCIceCandidateInit });
      }
    });

    peer.on("stream", (remoteStream) => {
      const videoTracks = remoteStream.getVideoTracks();
      if (videoTracks.length === 0) {
        audioEl.srcObject = remoteStream;
        return;
      }

      const looksLikeScreen = videoTracks.some((t) => {
        const s = t.getSettings() as MediaTrackSettings & {
          displaySurface?: string;
        };
        return !!s.displaySurface;
      });

      if (looksLikeScreen) {
        setState((prev) => ({
          ...prev,
          remoteScreenStreams: {
            ...prev.remoteScreenStreams,
            [remoteUserId]: remoteStream,
          },
          isScreenSharing: true,
          activeScreenSharerId: prev.activeScreenSharerId ?? remoteUserId,
        }));

        const cleanup = () => {
          setState((prev) => {
            const { [remoteUserId]: _gone, ...rest } =
              prev.remoteScreenStreams;
            const remainingIds = Object.keys(rest);
            const stillSharing =
              remainingIds.length > 0 || !!prev.localScreenStream;
            return {
              ...prev,
              remoteScreenStreams: rest,
              isScreenSharing: stillSharing,
              activeScreenSharerId:
                prev.activeScreenSharerId === remoteUserId
                  ? remainingIds[0] ??
                    (prev.localScreenStream ? currentUser.id : null)
                  : prev.activeScreenSharerId,
            };
          });
        };
        videoTracks.forEach((t) => t.addEventListener("ended", cleanup));
      } else {
        setState((prev) => ({
          ...prev,
          remoteCameraStreams: {
            ...prev.remoteCameraStreams,
            [remoteUserId]: remoteStream,
          },
        }));
        const cleanup = () => {
          setState((prev) => {
            const { [remoteUserId]: _gone, ...rest } = prev.remoteCameraStreams;
            return { ...prev, remoteCameraStreams: rest };
          });
        };
        videoTracks.forEach((t) => t.addEventListener("ended", cleanup));
      }
    });

    peer.on("error", (err) => {
      console.warn(`[WebRTC] peer error with ${remoteUserId}:`, err.message);
      destroyPeer(remoteUserId);
    });

    peer.on("close", () => {
      destroyPeer(remoteUserId);
    });

    return peer;
  };

  useEffect(() => {
    if (!socket) return;

    const onHuddleState = (payload: { roomId: string; participants: { userId: string; muted: boolean; handRaised: boolean }[] }) => {
      const localStream = stateRef.current.localStream;
      if (!localStream) return;

      const remoteUsers = payload.participants.filter(
        (p) => p.userId !== currentUser.id
      );

      setState((prev) => {
        const prevById = new Map<string, CallParticipant>(
          prev.participants.map((p) => [p.id, p])
        );
        for (const p of payload.participants) {
          if (p.userId === currentUser.id) continue;
          const before = prevById.get(p.userId);
          if (before && before.handRaised !== p.handRaised) {
            const u = users.find((u) => u.id === p.userId);
            const name = u?.name ?? "Someone";
            if (p.handRaised) {
              toast(`✋ ${name} raised their hand`, { duration: 3500 });
            } else {
              toast(`${name} lowered their hand`, { duration: 2000 });
            }
          }
        }

        return {
          ...prev,
          participants: [
            {
              id: currentUser.id,
              name: currentUser.name,
              avatar: currentUser.avatar,
              muted: prev.muted,
              handRaised: prev.handRaised,
            },
            ...remoteUsers.map((p) => {
              const u = users.find((u) => u.id === p.userId);
              return {
                id: p.userId,
                name: u?.name ?? p.userId,
                avatar: u?.avatar,
                muted: p.muted,
                handRaised: p.handRaised,
              };
            }),
          ],
        };
      });

      for (const remote of remoteUsers) {
        createPeer(remote.userId, localStream, true );
      }
    };

    const onUserJoined = (payload: { roomId: string; userId: string; participants: { userId: string; muted: boolean; handRaised: boolean }[] }) => {
      if (payload.userId === currentUser.id) return;
      const u = users.find((u) => u.id === payload.userId);

      setState((prev) => {
        if (prev.participants.some((p) => p.id === payload.userId)) return prev;
        return {
          ...prev,
          participants: [
            ...prev.participants,
            { id: payload.userId, name: u?.name ?? payload.userId, avatar: u?.avatar, muted: false },
          ],
        };
      });

    };

    const onUserLeft = (payload: { roomId: string; userId: string; participants: { userId: string }[] }) => {
      if (payload.userId === currentUser.id) return;
      destroyPeer(payload.userId);
      setState((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.id !== payload.userId),
      }));
    };

    const onOffer = ({ fromUserId, sdp }: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      const localStream = stateRef.current.localStream;
      if (!localStream) return;

      const peer = createPeer(fromUserId, localStream, false );
      peer.signal(sdp);
    };

    const onAnswer = ({ fromUserId, sdp }: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      const entry = peersRef.current.get(fromUserId);
      if (entry) entry.peer.signal(sdp);
    };

    const onIce = ({ fromUserId, candidate }: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      const entry = peersRef.current.get(fromUserId);
      if (entry) entry.peer.signal(candidate);
    };

    socket.on("huddle:state", onHuddleState);
    socket.on("huddle:user-joined", onUserJoined);
    socket.on("huddle:user-left", onUserLeft);
    socket.on("huddle:offer", onOffer);
    socket.on("huddle:answer", onAnswer);
    socket.on("huddle:ice", onIce);

    return () => {
      socket.off("huddle:state", onHuddleState);
      socket.off("huddle:user-joined", onUserJoined);
      socket.off("huddle:user-left", onUserLeft);
      socket.off("huddle:offer", onOffer);
      socket.off("huddle:answer", onAnswer);
      socket.off("huddle:ice", onIce);
    };
  }, [socket, currentUser.id]);

  const joinHuddle = async (roomId: string) => {
    if (stateRef.current.isInHuddle && stateRef.current.roomId === roomId) return;

    try {
      const constraints: MediaStreamConstraints = {
        audio: stateRef.current.inputDeviceId
          ? { deviceId: { exact: stateRef.current.inputDeviceId } }
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
        activeRooms: Array.from(new Set([...prev.activeRooms, roomId])),
      }));

      setUserPresence(currentUser.id, "online", { inHuddleTrackId: roomId });

      playJoinChime();
      await enumerateDevices();

      socket?.emit("huddle:join", { roomId });
    } catch (err) {
      console.error("[Huddle] Failed to access microphone:", err);
      setState((prev) => ({ ...prev, roomId: null, isInHuddle: false }));
    }
  };

  const leaveHuddle = () => {
    const { roomId, localStream, localScreenStream, localCameraStream } =
      stateRef.current;

    if (roomId) socket?.emit("huddle:leave", { roomId });

    localStream?.getTracks().forEach((t) => t.stop());
    localScreenStream?.getTracks().forEach((t) => t.stop());
    localCameraStream?.getTracks().forEach((t) => t.stop());

    destroyAllPeers();

    setUserPresence(currentUser.id, "online", { inHuddleTrackId: null });

    setState((prev) => ({
      ...prev,
      roomId: null,
      isInHuddle: false,
      participants: [],
      localStream: null,
      muted: false,
      handRaised: false,
      localScreenStream: null,
      remoteScreenStreams: {},
      isScreenSharing: false,
      activeScreenSharerId: null,
      localCameraStream: null,
      cameraOn: false,
      remoteCameraStreams: {},
      activeRooms: prev.activeRooms.filter((id) => id !== roomId),
    }));
  };

  const toggleMute = () => {
    const mutedNext = !stateRef.current.muted;

    stateRef.current.localStream
      ?.getAudioTracks()
      .forEach((t) => (t.enabled = !mutedNext));

    if (stateRef.current.roomId) {
      socket?.emit("huddle:mute", { roomId: stateRef.current.roomId, muted: mutedNext });
    }

    setState((prev) => ({
      ...prev,
      muted: mutedNext,
      participants: prev.participants.map((p) =>
        p.id === currentUser.id ? { ...p, muted: mutedNext } : p
      ),
    }));
  };

  const toggleHand = () => {
    const { roomId, participants } = stateRef.current;
    const me = participants.find((p) => p.id === currentUser.id);
    const raised = !me?.handRaised;

    if (roomId) socket?.emit("huddle:hand", { roomId, raised });

    setState((prev) => ({
      ...prev,
      handRaised: raised,
      participants: prev.participants.map((p) =>
        p.id === currentUser.id ? { ...p, handRaised: raised } : p
      ),
    }));
  };
  const raiseHand = toggleHand;

  const toggleScreenShare = async () => {
    const { localScreenStream } = stateRef.current;

    if (localScreenStream) {
      localScreenStream.getTracks().forEach((t) => t.stop());
      for (const { peer } of peersRef.current.values()) {
        try {
          (peer as any).removeStream?.(localScreenStream);
        } catch {}
      }
      setState((prev) => {
        const remoteIds = Object.keys(prev.remoteScreenStreams);
        return {
          ...prev,
          localScreenStream: null,
          isScreenSharing: remoteIds.length > 0,
          activeScreenSharerId:
            prev.activeScreenSharerId === currentUser.id
              ? remoteIds[0] ?? null
              : prev.activeScreenSharerId,
        };
      });
      return;
    }

    try {
      const stream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia(
        { video: { cursor: "always" }, audio: false }
      );

      for (const { peer } of peersRef.current.values()) {
        try {
          (peer as any).addStream?.(stream);
        } catch (err) {
          console.warn("[Huddle] addStream failed:", err);
        }
      }

      stream.getVideoTracks().forEach((t) => {
        t.addEventListener("ended", () => {
          toggleScreenShare();
        });
      });

      setState((prev) => ({
        ...prev,
        localScreenStream: stream,
        isScreenSharing: true,
        activeScreenSharerId: prev.activeScreenSharerId ?? currentUser.id,
      }));
    } catch (err) {
      console.warn("[Huddle] screen share aborted:", err);
    }
  };

  const toggleCamera = async () => {
    const { localCameraStream } = stateRef.current;

    if (localCameraStream) {
      localCameraStream.getTracks().forEach((t) => t.stop());
      for (const { peer } of peersRef.current.values()) {
        try {
          (peer as any).removeStream?.(localCameraStream);
        } catch {}
      }
      setState((prev) => ({
        ...prev,
        localCameraStream: null,
        cameraOn: false,
      }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      for (const { peer } of peersRef.current.values()) {
        try {
          (peer as any).addStream?.(stream);
        } catch (err) {
          console.warn("[Huddle] camera addStream failed:", err);
        }
      }

      stream.getVideoTracks().forEach((t) => {
        t.addEventListener("ended", () => {
          setState((prev) => ({
            ...prev,
            localCameraStream: null,
            cameraOn: false,
          }));
        });
      });

      setState((prev) => ({
        ...prev,
        localCameraStream: stream,
        cameraOn: true,
      }));
    } catch (err) {
      console.warn("[Huddle] camera failed:", err);
    }
  };

  const setInputDeviceId = async (deviceId: string) => {
    setState((prev) => ({ ...prev, inputDeviceId: deviceId }));
    if (!stateRef.current.isInHuddle) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });

      stateRef.current.localStream?.getTracks().forEach((t) => t.stop());

      if (localAudioRef.current) localAudioRef.current.srcObject = newStream;

      for (const { peer } of peersRef.current.values()) {
        const [newTrack] = newStream.getAudioTracks();
        if (newTrack && (peer as any)._pc) {
          const pc: RTCPeerConnection = (peer as any)._pc;
          const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
          if (sender) await sender.replaceTrack(newTrack);
        }
      }

      setState((prev) => ({ ...prev, localStream: newStream }));
    } catch (err) {
      console.error("[Huddle] Failed to switch input device:", err);
    }
  };

  const setOutputDeviceId = async (deviceId: string) => {
    setState((prev) => ({ ...prev, outputDeviceId: deviceId }));

    try {
      const el = localAudioRef.current as any;
      if (el && typeof el.setSinkId === "function") {
        await el.setSinkId(deviceId || "default");
      }
    } catch {}

    for (const { audioEl } of peersRef.current.values()) {
      try {
        if (typeof (audioEl as any).setSinkId === "function") {
          await (audioEl as any).setSinkId(deviceId || "default");
        }
      } catch {}
    }
  };

  const value: CallContextType = {
    ...state,
    joinHuddle,
    leaveHuddle,
    toggleMute,
    setInputDeviceId,
    toggleHand,
    raiseHand,
    setOutputDeviceId,
    toggleScreenShare,
    toggleCamera,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
};
