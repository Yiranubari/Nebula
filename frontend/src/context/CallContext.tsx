/**
 * CallContext — manages huddle (audio) calls using:
 *   • Socket.IO for signaling  (via SocketContext)
 *   • simple-peer for WebRTC P2P audio streams
 *
 * Architecture:
 *   When a user joins a room the server emits `huddle:state` with existing
 *   participants. This client creates an *initiating* Peer for each of them,
 *   sending an SDP offer via `huddle:offer`. Each recipient's client receives
 *   `huddle:offer`, creates a *non-initiating* Peer, and replies with
 *   `huddle:answer`. ICE candidates are relayed the same way.
 *
 *   When `huddle:user-joined` fires for a *new* joiner (after we're already in
 *   the room) the room awaits the new peer's offer — we do NOT initiate to
 *   avoid offer collisions. The server notifies the new joiner of existing
 *   participants via `huddle:state`, and the existing peers each send offers.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import SimplePeer from "simple-peer";
import { useApp } from "./AppContext";
import { useSocket } from "./SocketContext";

// ─── Types ───────────────────────────────────────────────────────────────────

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
};

type CallContextType = CallState & {
  joinHuddle: (roomId: string) => Promise<void>;
  leaveHuddle: () => void;
  toggleMute: () => void;
  setInputDeviceId: (deviceId: string) => Promise<void>;
  raiseHand: () => void;
  setOutputDeviceId: (deviceId: string) => Promise<void>;
};

// ─── Internal peer record ─────────────────────────────────────────────────────

type PeerEntry = {
  userId: string;
  peer: SimplePeer.Instance;
  audioEl: HTMLAudioElement;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const CallContext = createContext<CallContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

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
  });

  // Stable refs so socket event handlers don't stale-close over state
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ─── Lifecycle: hidden audio element + AudioContext ────────────────────────

  useEffect(() => {
    const el = document.createElement("audio");
    el.style.display = "none";
    el.autoplay = true;
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

  // ─── Helper: device enumeration ───────────────────────────────────────────

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

  // ─── Helper: join chime ───────────────────────────────────────────────────

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

  // ─── Helper: destroy a single peer ────────────────────────────────────────

  const destroyPeer = (userId: string) => {
    const entry = peersRef.current.get(userId);
    if (!entry) return;
    try { entry.peer.destroy(); } catch {}
    try { entry.audioEl.pause(); entry.audioEl.srcObject = null; document.body.removeChild(entry.audioEl); } catch {}
    peersRef.current.delete(userId);
  };

  // ─── Helper: destroy all peers ────────────────────────────────────────────

  const destroyAllPeers = () => {
    for (const userId of peersRef.current.keys()) destroyPeer(userId);
  };

  // ─── Helper: create a peer and wire it up ─────────────────────────────────

  const createPeer = (
    remoteUserId: string,
    localStream: MediaStream,
    initiator: boolean
  ): SimplePeer.Instance => {
    // Destroy stale peer if it exists
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

    // Create audio element for remote stream
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    audioEl.style.display = "none";
    document.body.appendChild(audioEl);

    // Apply output device if already selected
    const outputDeviceId = stateRef.current.outputDeviceId;
    if (outputDeviceId && typeof (audioEl as any).setSinkId === "function") {
      (audioEl as any).setSinkId(outputDeviceId).catch(() => {});
    }

    peersRef.current.set(remoteUserId, { userId: remoteUserId, peer, audioEl });

    // When we have a signal (offer / answer / ICE candidate)
    peer.on("signal", (data) => {
      const roomId = stateRef.current.roomId;
      if (!socket || !roomId) return;

      if (data.type === "offer") {
        socket.emit("huddle:offer", { roomId, toUserId: remoteUserId, sdp: data as RTCSessionDescriptionInit });
      } else if (data.type === "answer") {
        socket.emit("huddle:answer", { roomId, toUserId: remoteUserId, sdp: data as RTCSessionDescriptionInit });
      } else {
        // ICE candidate
        socket.emit("huddle:ice", { roomId, toUserId: remoteUserId, candidate: data as RTCIceCandidateInit });
      }
    });

    // When remote stream arrives
    peer.on("stream", (remoteStream) => {
      audioEl.srcObject = remoteStream;
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

  // ─── Socket.IO signaling event handlers ───────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    // Server confirmed room state (on join — create offers to all existing participants)
    const onHuddleState = (payload: { roomId: string; participants: { userId: string; muted: boolean; handRaised: boolean }[] }) => {
      const localStream = stateRef.current.localStream;
      if (!localStream) return;

      const remoteUsers = payload.participants.filter(
        (p) => p.userId !== currentUser.id
      );

      // Build participants list
      setState((prev) => ({
        ...prev,
        participants: [
          { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar, muted: prev.muted },
          ...remoteUsers.map((p) => {
            const u = users.find((u) => u.id === p.userId);
            return { id: p.userId, name: u?.name ?? p.userId, avatar: u?.avatar, muted: p.muted, handRaised: p.handRaised };
          }),
        ],
      }));

      // Initiate connections to existing participants
      for (const remote of remoteUsers) {
        createPeer(remote.userId, localStream, true /* initiator */);
      }
    };

    // A new user joined after us — wait for their offer (they are the initiators)
    const onUserJoined = (payload: { roomId: string; userId: string; participants: { userId: string; muted: boolean; handRaised: boolean }[] }) => {
      if (payload.userId === currentUser.id) return;
      const u = users.find((u) => u.id === payload.userId);

      setState((prev) => {
        // Add them if not already listed
        if (prev.participants.some((p) => p.id === payload.userId)) return prev;
        return {
          ...prev,
          participants: [
            ...prev.participants,
            { id: payload.userId, name: u?.name ?? payload.userId, avatar: u?.avatar, muted: false },
          ],
        };
      });

      // The server will prompt the new user to create offers to each existing participant.
      // We do NOT initiate here — we simply prepare a non-initiating peer lazily in onOffer.
    };

    // A user left
    const onUserLeft = (payload: { roomId: string; userId: string; participants: { userId: string }[] }) => {
      if (payload.userId === currentUser.id) return;
      destroyPeer(payload.userId);
      setState((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.id !== payload.userId),
      }));
    };

    // Incoming SDP offer from a remote peer
    const onOffer = ({ fromUserId, sdp }: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      const localStream = stateRef.current.localStream;
      if (!localStream) return;

      const peer = createPeer(fromUserId, localStream, false /* not initiator */);
      peer.signal(sdp);
    };

    // Incoming SDP answer
    const onAnswer = ({ fromUserId, sdp }: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      const entry = peersRef.current.get(fromUserId);
      if (entry) entry.peer.signal(sdp);
    };

    // Incoming ICE candidate
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
    // Re-register whenever socket identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, currentUser.id]);

  // ─── Public API: joinHuddle ───────────────────────────────────────────────

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

      // Update presence
      setUserPresence(currentUser.id, "online", { inHuddleTrackId: roomId });

      playJoinChime();
      await enumerateDevices();

      // Tell the server we're joining
      socket?.emit("huddle:join", { roomId });
    } catch (err) {
      console.error("[Huddle] Failed to access microphone:", err);
      setState((prev) => ({ ...prev, roomId: null, isInHuddle: false }));
    }
  };

  // ─── Public API: leaveHuddle ──────────────────────────────────────────────

  const leaveHuddle = () => {
    const { roomId, localStream } = stateRef.current;

    // Notify server
    if (roomId) socket?.emit("huddle:leave", { roomId });

    // Stop local tracks
    localStream?.getTracks().forEach((t) => t.stop());

    // Destroy all peer connections
    destroyAllPeers();

    // Update presence
    setUserPresence(currentUser.id, "online", { inHuddleTrackId: null });

    setState((prev) => ({
      ...prev,
      roomId: null,
      isInHuddle: false,
      participants: [],
      localStream: null,
      muted: false,
      activeRooms: prev.activeRooms.filter((id) => id !== roomId),
    }));
  };

  // ─── Public API: toggleMute ───────────────────────────────────────────────

  const toggleMute = () => {
    const mutedNext = !stateRef.current.muted;

    // Toggle local audio tracks
    stateRef.current.localStream
      ?.getAudioTracks()
      .forEach((t) => (t.enabled = !mutedNext));

    // Tell server so other participants' UIs update
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

  // ─── Public API: raiseHand ────────────────────────────────────────────────

  const raiseHand = () => {
    const { roomId, participants } = stateRef.current;
    const me = participants.find((p) => p.id === currentUser.id);
    const raised = !me?.handRaised;

    if (roomId) socket?.emit("huddle:hand", { roomId, raised });

    setState((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.id === currentUser.id ? { ...p, handRaised: raised } : p
      ),
    }));
  };

  // ─── Public API: setInputDeviceId ─────────────────────────────────────────

  const setInputDeviceId = async (deviceId: string) => {
    setState((prev) => ({ ...prev, inputDeviceId: deviceId }));
    if (!stateRef.current.isInHuddle) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });

      // Stop old tracks
      stateRef.current.localStream?.getTracks().forEach((t) => t.stop());

      if (localAudioRef.current) localAudioRef.current.srcObject = newStream;

      // Replace track on every peer connection
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

  // ─── Public API: setOutputDeviceId ────────────────────────────────────────

  const setOutputDeviceId = async (deviceId: string) => {
    setState((prev) => ({ ...prev, outputDeviceId: deviceId }));

    // Apply to local monitoring element
    try {
      const el = localAudioRef.current as any;
      if (el && typeof el.setSinkId === "function") {
        await el.setSinkId(deviceId || "default");
      }
    } catch {}

    // Apply to all remote audio elements
    for (const { audioEl } of peersRef.current.values()) {
      try {
        if (typeof (audioEl as any).setSinkId === "function") {
          await (audioEl as any).setSinkId(deviceId || "default");
        }
      } catch {}
    }
  };

  // ─── Value ────────────────────────────────────────────────────────────────

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
