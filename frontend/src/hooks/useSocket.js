// useSocket.js
import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

// Singleton socket shared across all hooks/components to avoid multiple connections.
let sharedSocket = null;
let sharedUrl = null;

export const useSocket = (opts = {}) => {
  const socketRef = useRef(sharedSocket);

  useEffect(() => {
    const base =
      opts.url ||
      import.meta.env.VITE_SOCKET_URL ||
      "http://localhost:5000";

    if (!sharedSocket || sharedUrl !== base) {
      sharedUrl = base;
      sharedSocket = io(base, { autoConnect: true });
    }

    socketRef.current = sharedSocket;

    const s = socketRef.current;
    const onErr = (err) => {
      console.error("socket connect_error", err);
    };
    s.on("connect_error", onErr);

    return () => {
      s.off("connect_error", onErr);
      // Do not disconnect here; shared socket lives for app lifetime.
    };
  }, [opts.url]);

  const emit = useCallback((event, payload) => {
    if (sharedSocket && sharedSocket.connected) {
      sharedSocket.emit(event, payload);
    }
  }, []);

  const on = useCallback((event, cb) => {
    if (sharedSocket) {
      sharedSocket.on(event, cb);
    }
    return () => {
      if (sharedSocket) {
        sharedSocket.off(event, cb);
      }
    };
  }, []);

  const once = useCallback((event, cb) => {
    if (sharedSocket) {
      sharedSocket.once(event, cb);
    }
  }, []);

  return { socketRef, emit, on, once };
};