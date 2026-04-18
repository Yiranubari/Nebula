/**
 * SocketContext — provides a single authenticated Socket.IO connection for the
 * entire app. All other contexts (AppContext, CallContext, …) import
 * `useSocket()`.
 */

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
  /** True once we've attempted (or completed) at least one connection in this session. */
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
  // Live socket lives in a ref so connect/disconnect are stable across renders
  // and don't see stale state. A mirrored state value lets consumers re-render
  // when the socket is replaced.
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
    // If we already have a socket (connected OR mid-handshake) with this same
    // token, keep it. This is important in React StrictMode dev, where the
    // useEffect in SocketConnector runs twice on mount — without this guard
    // we'd tear down the first socket before its WebSocket handshake
    // completes, producing the "closed before connection established" error
    // in the browser console.
    const current = socketRef.current;
    if (current) {
      const currentToken = (current as any)?.auth?.token;
      if (currentToken === token) return;
    }

    // Replace any stale socket (e.g., the token just changed after login).
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
      // "io client disconnect" is an intentional teardown — don't warn.
      if (reason !== "io client disconnect" && hasConnectedOnceRef.current) {
        setIsReconnecting(true);
        toast.error("Connection lost. Reconnecting…");
      }
    });
    s.on("connect_error", (err) => {
      // Surface once to the console; the banner handles user-facing feedback.
      // eslint-disable-next-line no-console
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

  // Cleanup on unmount of the provider
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
