
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@nebula/shared";
import { sharedRefresh } from "../services/api";

export type NebSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type SocketErrorKind =
  | "auth"
  | "transport"
  | "unknown"
  | null;

interface SocketContextValue {
  socket: NebSocket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  hasAttempted: boolean;
  lastErrorKind: SocketErrorKind;
  lastErrorMessage: string | null;
  connect: (token?: string) => void;
  disconnect: () => void;
}

const readStoredToken = (): string =>
  (typeof localStorage !== "undefined" &&
    (localStorage.getItem("nebula.accessToken") ||
      localStorage.getItem("nebula.token.v1"))) ||
  "";

const classifyError = (msg: string | undefined): SocketErrorKind => {
  if (!msg) return "unknown";
  const m = msg.toLowerCase();
  if (
    m.includes("authentication") ||
    m.includes("jwt") ||
    m.includes("token") ||
    m.includes("unauthorized")
  ) {
    return "auth";
  }
  if (
    m.includes("xhr poll") ||
    m.includes("websocket") ||
    m.includes("transport") ||
    m.includes("network") ||
    m.includes("timeout")
  ) {
    return "transport";
  }
  return "unknown";
};

const SocketContext = createContext<SocketContextValue | null>(null);

const SOCKET_URL =
  (import.meta as any).env?.VITE_SOCKET_URL ||
  (import.meta as any).env?.VITE_API_URL?.replace("/api", "") ||
  "http://localhost:7000";

export const SocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const socketRef = useRef<NebSocket | null>(null);
  const [socket, setSocket] = useState<NebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [lastErrorKind, setLastErrorKind] = useState<SocketErrorKind>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const hasConnectedOnceRef = useRef(false);
  const refreshInFlightRef = useRef(false);

  const teardown = useCallback(() => {
    const s = socketRef.current;
    if (s) {
      s.removeAllListeners();
      s.disconnect();
    }
    socketRef.current = null;
  }, []);

  const connect = useCallback((_token?: string) => {
    if (socketRef.current) return;

    setHasAttempted(true);
    setLastErrorKind(null);
    setLastErrorMessage(null);

    const s = io(SOCKET_URL, {
      auth: (cb) => cb({ token: readStoredToken() }),
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 20000,
    }) as NebSocket;

    s.on("connect", () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setLastErrorKind(null);
      setLastErrorMessage(null);
      if (hasConnectedOnceRef.current) {
        toast.success("Reconnected");
      }
      hasConnectedOnceRef.current = true;
    });
    s.on("disconnect", (reason) => {
      setIsConnected(false);
      if (reason !== "io client disconnect" && hasConnectedOnceRef.current) {
        setIsReconnecting(true);
        toast.error("Connection lost. Reconnecting…");
      }
    });
    s.on("connect_error", (err) => {
      const kind = classifyError(err.message);
      setLastErrorKind(kind);
      setLastErrorMessage(err.message);
      console.warn("[Socket] connection error:", err.message);

      if (kind === "auth" && !refreshInFlightRef.current) {
        refreshInFlightRef.current = true;
        sharedRefresh()
          .catch(() => null)
          .finally(() => {
            refreshInFlightRef.current = false;
          });
      }
    });

    socketRef.current = s;
    setSocket(s);
  }, []);

  const disconnect = useCallback(() => {
    teardown();
    setSocket(null);
    setIsConnected(false);
    setIsReconnecting(false);
    setHasAttempted(false);
    setLastErrorKind(null);
    setLastErrorMessage(null);
    hasConnectedOnceRef.current = false;
  }, [teardown]);

  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isReconnecting,
        hasAttempted,
        lastErrorKind,
        lastErrorMessage,
        connect,
        disconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextValue => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
};
