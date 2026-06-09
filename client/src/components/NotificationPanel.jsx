import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useLang } from '../context/LanguageContext';

export default function NotificationPanel({ isOpen, onClose }) {
  const { notifications, markAsRead, deleteNotification } = useSocket();
  const { lang } = useLang();
  const [activeTab, setStatusTab] = useState('all'); // 'all' or 'unread'

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') {
      return n.is_read === 0;
    }
    return true;
  });

  const handleMarkAllRead = () => {
    markAsRead(null); // passing null marks all as read
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return lang === 'vi' ? 'Vừa xong' : 'Just now';
    if (diffMins < 60) return lang === 'vi' ? `${diffMins} phút trước` : `${diffMins}m ago`;
    if (diffHours < 24) return lang === 'vi' ? `${diffHours} giờ trước` : `${diffHours}h ago`;
    return date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`notification-panel ${isOpen ? 'open' : ''}`}>
      <div className="notif-header">
        <h3 style={{ fontSize: '1.2rem', textAlign: 'left' }}>
          {lang === 'vi' ? 'Thông báo' : 'Notifications'}
        </h3>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          {notifications.some(n => n.is_read === 0) && (
            <button 
              onClick={handleMarkAllRead} 
              style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}
            >
              {lang === 'vi' ? 'Đọc tất cả' : 'Mark all read'}
            </button>
          )}
          <button onClick={onClose} style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>&times;</button>
        </div>
      </div>

      <div className="notif-tabs">
        <div 
          className={`notif-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setStatusTab('all')}
        >
          {lang === 'vi' ? `Tất cả (${notifications.length})` : `All (${notifications.length})`}
        </div>
        <div 
          className={`notif-tab ${activeTab === 'unread' ? 'active' : ''}`}
          onClick={() => setStatusTab('unread')}
        >
          {lang === 'vi' ? `Chưa đọc (${notifications.filter(n => n.is_read === 0).length})` : `Unread (${notifications.filter(n => n.is_read === 0).length})`}
        </div>
      </div>

      <div className="notif-list">
        {filteredNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
            {lang === 'vi' ? 'Không có thông báo nào.' : 'No notifications.'}
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`notif-item ${notif.is_read === 0 ? 'unread' : ''}`}
              onClick={() => markAsRead(notif.id)}
              style={{ textAlign: 'left' }}
            >
              <div className="search-icon" style={{ borderRadius: '50%', width: '36px', height: '36px' }}>
                {notif.type === 'application' ? (
                  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                ) : (
                  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                  </svg>
                )}
              </div>
              <div className="notif-content" style={{ flex: 1 }}>
                <div>{notif.message}</div>
                <div className="notif-time">{formatTime(notif.created_at)}</div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notif.id);
                }}
                style={{ color: 'var(--text-muted)', fontSize: '1.25rem', padding: '0.2rem' }}
                title={lang === 'vi' ? 'Xóa thông báo' : 'Delete Notification'}
              >
                &times;
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
