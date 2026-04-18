/**
 * SocketContext — provides a single authenticated Socket.IO connection for the
 * entire app. All other contexts (CallContext, etc.) import `useSocket()`.
 *
 * The socket is created lazily on first auth and destroyed on logout.
 */

import React, {
  createContext,
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
  const [socket, setSocket] = useState<NebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Track whether a reconnect attempt is in flight so we can show a distinct UI
  const [isReconnecting, setIsReconnecting] = useState(false);
  // First-connect suppression — don't toast "disconnected" before ever connecting
  const hasConnectedOnceRef = useRef(false);

  const connect = (token: string) => {
    // Prevent double-connections
    if (socket?.connected) return;

    // Tear down any previous stale socket
    socket?.disconnect();

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
      // "io client disconnect" is an intentional teardown — don't warn
      if (reason !== "io client disconnect" && hasConnectedOnceRef.current) {
        setIsReconnecting(true);
        toast.error("Connection lost. Reconnecting…");
      }
    });
    s.on("connect_error", (err) => {
      console.warn("[Socket] connection error:", err.message);
    });

    setSocket(s);
  };

  const disconnect = () => {
    socket?.disconnect();
    setSocket(null);
    setIsConnected(false);
    setIsReconnecting(false);
    hasConnectedOnceRef.current = false;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socket?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket, isConnected, isReconnecting, connect, disconnect }}
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
