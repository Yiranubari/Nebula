
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

export type NebSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextValue {
  socket: NebSocket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  hasAttempted: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
}

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
  const hasConnectedOnceRef = useRef(false);

  const teardown = useCallback(() => {
    const s = socketRef.current;
    if (s) {
      s.removeAllListeners();
      s.disconnect();
    }
    socketRef.current = null;
  }, []);

  const connect = useCallback((token: string) => {
    const current = socketRef.current;
    if (current) {
      const currentToken = (current as any)?.auth?.token;
      if (currentToken === token) return;
    }

    teardown();
    setHasAttempted(true);

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    }) as NebSocket;

    s.on("connect", () => {
      setIsConnected(true);
      setIsReconnecting(false);
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
      console.warn("[Socket] connection error:", err.message);
    });

    socketRef.current = s;
    setSocket(s);
  }, [teardown]);

  const disconnect = useCallback(() => {
    teardown();
    setSocket(null);
    setIsConnected(false);
    setIsReconnecting(false);
    setHasAttempted(false);
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
