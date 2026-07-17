import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let timeoutId;

    // Only connect socket if user is logged in
    const userId = user?._id || user?.id;
    if (user && userId) {
      timeoutId = setTimeout(() => {
        let socketUrl = 'https://apexconsult.onrender.com';
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          socketUrl = 'http://localhost:5000';
        }
        
        const envUrl = import.meta.env.VITE_API_URL;
        if (envUrl) {
          socketUrl = envUrl.replace('/api', '');
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
      }, 2000); // 2 second delay to prevent early connection errors

      return () => {
        clearTimeout(timeoutId);
        if (socket) socket.disconnect();
      };
    } else if (socket) {
      // Disconnect if user logs out
      socket.disconnect();
      setSocket(null);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
