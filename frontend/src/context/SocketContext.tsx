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
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@nebula/shared";

export type NebSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextValue {
  socket: NebSocket | null;
  isConnected: boolean;
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
  const [isConnected, setIsConnected] = useState(false);

  const connect = (token: string) => {
    // Prevent double-connections
    if (socketRef.current?.connected) return;

    // Tear down any previous stale socket
    socketRef.current?.disconnect();

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    }) as NebSocket;

    s.on("connect", () => setIsConnected(true));
    s.on("disconnect", () => setIsConnected(false));
    s.on("connect_error", (err) => {
      console.warn("[Socket] connection error:", err.message);
    });

    socketRef.current = s;
  };

  const disconnect = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, isConnected, connect, disconnect }}
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
