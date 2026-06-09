import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socket';

export default function useSocket() {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(socketService.getSocket());

  useEffect(() => {
    if (!token || !user) {
      socketService.disconnect();
      setSocket(null);
      return;
    }

    const currentSocket = socketService.connect(token);
    setSocket(currentSocket);

    // No disconnect on unmount to keep socket connection alive between view changes
  }, [token, user]);

  return socket;
}
