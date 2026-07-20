import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { getBaseUrl } from '../services/api';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect socket if user is logged in
    const userId = user?._id || user?.id;
    if (user && userId) {
      // Use our central API URL logic which correctly handles the Android emulator
      const socketUrl = getBaseUrl().replace('/api', '');
        
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
