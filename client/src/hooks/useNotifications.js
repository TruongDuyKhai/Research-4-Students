import { useEffect, useState } from 'react';
import useSocket from './useSocket';

export default function useNotifications() {
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Fetch initial list
    socket.emit('notification:getAll');

    // Listener for all notifications response
    const handleAll = (data) => {
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    };

    // Listener for new notification
    const handleNew = (notif) => {
      setNotifications(prev => {
        // Prevent duplicates
        if (prev.some(n => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount(prev => prev + 1);
    };

    // Listener for single mark read confirmation
    const handleMarked = ({ id, unreadCount: newUnreadCount }) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(newUnreadCount);
    };

    // Listener for mark all read confirmation
    const handleMarkedAll = ({ unreadCount: newUnreadCount }) => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(newUnreadCount);
    };

    socket.on('notification:all', handleAll);
    socket.on('notification:new', handleNew);
    socket.on('notification:marked', handleMarked);
    socket.on('notification:markedAll', handleMarkedAll);

    // Keep listening on new_notification (from existing project chats/group messaging)
    const handleProjectNotif = (notif) => {
      const standardNotif = {
        id: notif.id || Date.now(),
        user_id: notif.user_id,
        type: notif.type || 'message',
        message: notif.message,
        is_read: notif.is_read || 0,
        ref_id: notif.ref_id,
        created_at: notif.created_at || new Date().toISOString()
      };
      handleNew(standardNotif);
    };
    socket.on('new_notification', handleProjectNotif);

    return () => {
      socket.off('notification:all', handleAll);
      socket.off('notification:new', handleNew);
      socket.off('notification:marked', handleMarked);
      socket.off('notification:markedAll', handleMarkedAll);
      socket.off('new_notification', handleProjectNotif);
    };
  }, [socket]);

  const markRead = (id) => {
    if (socket) {
      socket.emit('notification:markRead', { id });
    }
  };

  const markAllRead = () => {
    if (socket) {
      socket.emit('notification:markAllRead');
    }
  };

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead
  };
}
