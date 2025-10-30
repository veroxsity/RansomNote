'use client';

import { FC, PropsWithChildren, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketContext } from './socket.context';

const RAW_SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';
const BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT || '';

export const SocketProvider: FC<PropsWithChildren> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Resolve socket URL: if NEXT_PUBLIC_SOCKET_URL is 'auto' (or empty), build from window location
    let resolvedUrl = RAW_SOCKET_URL;
    if (!resolvedUrl || resolvedUrl === 'auto') {
      if (typeof window !== 'undefined') {
        const proto = window.location.protocol;
        const host = window.location.hostname;
        const port = BACKEND_PORT || '3001';
        resolvedUrl = `${proto}//${host}:${port}`;
      } else {
        resolvedUrl = 'http://localhost:3001';
      }
    }

    const socketInstance = io(resolvedUrl, {
      path: '/socket.io',
      transports: ['websocket'], // avoid HTTP polling CORS in dev
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Debug: log all inbound events when enabled
    const debug = (process.env.NEXT_PUBLIC_DEBUG_SOCKET ?? 'false') === 'true' ||
      (typeof window !== 'undefined' && window.localStorage.getItem('debugSocket') === 'true');
    if (debug) {
      socketInstance.onAny((event, ...args) => {
        if (event !== 'ping' && event !== 'pong') {
          console.log('📩 socket event:', event, args?.[0] ?? '');
        }
      });
    }

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Listen for host-triggered end-game from UI
    const endListener = () => {
      if (socketInstance && socketInstance.connected) {
        // We need the lobby code; rely on server to infer from socket
        // Emit with empty payload, server handler will look up lobby by socket
        // but our server expects { code }, so we store lobby code in a custom property when joined
        const code = (window as any).__ransom_lobby_code__;
        if (code) {
          socketInstance.emit('game:end', { code });
        }
      }
    };
    window.addEventListener('game:end-request', endListener);

    return () => {
      socketInstance.close();
      window.removeEventListener('game:end-request', endListener);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};