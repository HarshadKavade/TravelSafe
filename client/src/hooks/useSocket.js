import { useEffect } from "react";
import socket from "../socket/socket";

export default function useSocket(eventName, callback) {
  useEffect(() => {
    if (!eventName || !callback) return;

    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, [eventName, callback]);

  return socket;
}
