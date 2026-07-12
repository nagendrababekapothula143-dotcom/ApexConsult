import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect socket if user is logged in
    const userId = user?._id || user?.id;
    if (user && userId) {
      let socketUrl = 'http://localhost:5000';
      const envUrl = import.meta.env.VITE_API_URL;
      if (envUrl && !envUrl.includes('localhost')) {
        socketUrl = envUrl.replace('/api', '');
      } else {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        socketUrl = `${protocol}//${hostname}:5000`;
      }
        
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Connected to WebSocket server');
        // Register the user with the socket server
        newSocket.emit('join', { userId: userId, role: user.role });
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else if (socket) {
      // Disconnect if user logs out
      socket.disconnect();
      setSocket(null);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
