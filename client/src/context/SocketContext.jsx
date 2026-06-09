import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import axios from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
      const unreads = res.data.filter(n => n.is_read === 0).length;
      setUnreadCount(unreads);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Mark notification as read
  const markAsRead = async (id = null) => {
    try {
      await axios.put('/api/notifications/read', { id });
      if (id) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
        );
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      }
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  // Delete notification
  const deleteNotification = async (id) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Recalculate unread count whenever notifications change
  useEffect(() => {
    const unreads = notifications.filter(n => n.is_read === 0).length;
    setUnreadCount(unreads);
  }, [notifications]);

  // Handle Socket.io lifecycle
  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Connect to Socket.io server
    // In development proxy, this can connect directly to origin or path
    const newSocket = io({
      autoConnect: true,
      withCredentials: true
    });

    setSocket(newSocket);
    fetchNotifications();

    // Listen for new notifications
    newSocket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ 
      socket, 
      notifications, 
      unreadCount, 
      markAsRead, 
      deleteNotification, 
      fetchNotifications 
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
