import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { token, currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [botStatuses, setBotStatuses] = useState({});
  const [qrCodes, setQrCodes] = useState({});
  const [messages, setMessages] = useState({});
  
  // Initialize socket connection when user is authenticated
  useEffect(() => {
    let newSocket;

    if (token && currentUser) {
      // Connect to socket.io server
      newSocket = io(process.env.REACT_APP_SOCKET_URL || '', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      });

      // Setup event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
        // Authenticate socket connection
        newSocket.emit('authenticate', token);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('auth_error', (error) => {
        console.error('Socket authentication error:', error);
      });

      // Bot events
      newSocket.on('bot_status', ({ botId, status }) => {
        setBotStatuses(prev => ({ ...prev, [botId]: status }));
      });

      newSocket.on('bot_qr', ({ botId, qr }) => {
        setQrCodes(prev => ({ ...prev, [botId]: qr }));
      });

      newSocket.on('bot_error', ({ botId, error }) => {
        console.error(`Bot ${botId} error:`, error);
      });

      newSocket.on('new_message', ({ botId, message }) => {
        setMessages(prev => {
          const botMessages = prev[botId] || [];
          return {
            ...prev,
            [botId]: [message, ...botMessages]
          };
        });
      });

      setSocket(newSocket);
    }

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token, currentUser]);

  // Function to start a bot
  const startBot = (botId) => {
    if (socket && connected) {
      socket.emit('start_bot', { botId });
    }
  };

  // Function to stop a bot
  const stopBot = (botId) => {
    if (socket && connected) {
      socket.emit('stop_bot', { botId });
    }
  };

  // Clear QR code for a bot
  const clearQrCode = (botId) => {
    setQrCodes(prev => {
      const updatedQrCodes = { ...prev };
      delete updatedQrCodes[botId];
      return updatedQrCodes;
    });
  };

  const value = {
    socket,
    connected,
    botStatuses,
    qrCodes,
    messages,
    startBot,
    stopBot,
    clearQrCode
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}; 