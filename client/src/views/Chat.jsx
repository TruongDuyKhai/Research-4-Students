import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

export default function Chat() {
  const { user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const socket = useSocket();

  // State
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  const threadEndRef = useRef(null);
  const threadContainerRef = useRef(null);

  // Check login
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load conversation list from REST API
  const fetchContacts = async (selectUserId = null) => {
    setLoadingContacts(true);
    try {
      const res = await axios.get('/api/chat/users');
      setContacts(res.data);

      // Handle starting chat from URL query parameter (e.g. /chat?user=3)
      const queryParams = new URLSearchParams(window.location.search);
      const queryUserId = selectUserId || queryParams.get('user');

      if (queryUserId) {
        const targetId = parseInt(queryUserId);
        const existing = res.data.find(c => c.user.id === targetId);

        if (existing) {
          setActiveContact(existing.user);
        } else {
          // Fetch user profile to add temporary contact
          try {
            const userRes = await axios.get(`/api/users/profile/${targetId}`);
            const newUserContact = {
              user: userRes.data.profile,
              lastMessage: null,
              unreadCount: 0
            };
            setContacts(prev => [newUserContact, ...prev]);
            setActiveContact(userRes.data.profile);
          } catch (err) {
            console.error('Failed to load user profile for starting chat:', err);
          }
        }
      } else if (res.data.length > 0 && !activeContact) {
        // Default to first contact
        setActiveContact(res.data[0].user);
      }
    } catch (err) {
      console.error('Error loading chat contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  // Fetch chat history when active contact changes
  const fetchChatHistory = async (otherUserId, pageNum = 1, append = false) => {
    if (!otherUserId) return;
    setLoadingHistory(true);
    try {
      const res = await axios.get(`/api/chat/${otherUserId}/history?page=${pageNum}&limit=30`);
      const newMsgs = res.data; // REST returns chronologically ordered (oldest first)

      if (newMsgs.length < 30) {
        setHasMoreHistory(false);
      } else {
        setHasMoreHistory(true);
      }

      if (append) {
        setMessages(prev => [...newMsgs, ...prev]);
      } else {
        setMessages(newMsgs);
        // Scroll to bottom on initial load
        setTimeout(scrollToBottom, 50);
      }
      setHistoryPage(pageNum);
    } catch (err) {
      console.error('Error loading chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeContact) {
      fetchChatHistory(activeContact.id, 1, false);
      
      // Mark messages as read via socket
      if (socket) {
        socket.emit('chat:read', { other_user_id: activeContact.id });
      }

      // Update local unreadCount badge for this contact
      setContacts(prev => 
        prev.map(c => c.user.id === activeContact.id ? { ...c, unreadCount: 0 } : c)
      );
    } else {
      setMessages([]);
    }
  }, [activeContact, socket]);

  // Set up socket listeners for real-time messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      // If message is from/to the active contact
      if (activeContact && (msg.sender_id === activeContact.id || msg.receiver_id === activeContact.id)) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(scrollToBottom, 50);

        // Mark read immediately if we are currently looking at this conversation
        if (msg.sender_id === activeContact.id) {
          socket.emit('chat:read', { other_user_id: activeContact.id });
        }
      }

      // Refresh contact list summaries (to update last message preview and unread badges)
      setContacts(prev => {
        const exists = prev.some(c => c.user.id === (msg.sender_id === user.id ? msg.receiver_id : msg.sender_id));
        if (exists) {
          return prev.map(c => {
            const isOther = c.user.id === (msg.sender_id === user.id ? msg.receiver_id : msg.sender_id);
            if (isOther) {
              const isActive = activeContact && activeContact.id === c.user.id;
              return {
                ...c,
                lastMessage: msg,
                unreadCount: (isActive || msg.sender_id === user.id) ? 0 : c.unreadCount + 1
              };
            }
            return c;
          }).sort((a, b) => {
            const dateA = new Date(a.lastMessage ? a.lastMessage.created_at : 0);
            const dateB = new Date(b.lastMessage ? b.lastMessage.created_at : 0);
            return dateB - dateA;
          });
        } else {
          // Fetch updated contacts list to include the new contact
          fetchContacts();
          return prev;
        }
      });
    };

    const handleReadConfirmation = ({ other_user_id }) => {
      if (activeContact && activeContact.id === other_user_id) {
        setMessages(prev => prev.map(m => m.receiver_id === other_user_id ? { ...m, is_read: 1 } : m));
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:read', handleReadConfirmation);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:read', handleReadConfirmation);
    };
  }, [socket, activeContact, user]);

  const scrollToBottom = () => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!socket || !inputText.trim() || !activeContact) return;

    // Send message via socket
    socket.emit('chat:send', {
      receiver_id: activeContact.id,
      content: inputText.trim()
    });

    setInputText('');
  };

  // Group messages by date
  const getGroupedMessages = () => {
    const groups = {};
    messages.forEach(msg => {
      const dateStr = new Date(msg.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(msg);
    });
    return groups;
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupedMsgs = getGroupedMessages();

  return (
    <div className="chat-container">
      {/* Scoped Styles */}
      <style>{`
        .chat-container { display: flex; gap: 1.5rem; max-width: 1200px; margin: 100px auto 40px; padding: 0 1.5rem; height: calc(100vh - 160px); min-height: 550px; align-items: stretch; text-align: left; }
        .chat-sidebar { flex: 0 0 320px; display: flex; flex-direction: column; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
        .chat-sidebar-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 1.1rem; color: var(--text-primary); }
        .chat-contacts-list { flex: 1; overflow-y: auto; padding: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .contact-item { display: flex; gap: 0.8rem; align-items: center; padding: 0.8rem 1rem; border-radius: 8px; cursor: pointer; transition: background 0.2s, border-color 0.2s; border: 1px solid transparent; }
        .contact-item:hover { background: var(--bg-secondary); }
        .contact-item.active { background: var(--bg-secondary); border-color: var(--accent); }
        
        .chat-avatar-wrap { position: relative; flex-shrink: 0; }
        .avatar-chat { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color); }
        .contact-info { flex: 1; min-width: 0; }
        .contact-name { font-weight: 600; font-size: 0.95rem; display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); }
        .last-message { font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px; }
        .badge-unread { background: var(--accent); color: #0f1117; font-size: 0.75rem; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 5px; }

        .chat-main { flex: 1; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; display: flex; flex-direction: column; min-width: 0; }
        .chat-header { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 1rem; }
        .chat-header h3 { font-size: 1.1rem; fontWeight: 700; margin: 0; color: var(--text-primary); }
        
        .chat-thread { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .date-divider { display: flex; align-items: center; justify-content: center; margin: 1.5rem 0; font-size: 0.8rem; color: var(--text-muted); font-weight: 500; }
        .date-divider::before, .date-divider::after { content: ''; flex: 1; height: 1px; background: var(--border-color); margin: 0 1rem; }
        
        .msg-row { display: flex; width: 100%; margin: 2px 0; }
        .msg-row.sent { justify-content: flex-end; }
        .msg-row.received { justify-content: flex-start; }
        
        .msg-bubble-wrap { display: flex; flex-direction: column; max-width: 65%; }
        .msg-bubble { padding: 0.7rem 1rem; border-radius: 12px; font-size: 0.95rem; line-height: 1.5; word-break: break-word; }
        .msg-row.sent .msg-bubble { background: var(--accent); color: #0f1117; font-weight: 500; border-bottom-right-radius: 2px; }
        .msg-row.received .msg-bubble { background: var(--bg-secondary); color: var(--text-primary); border-bottom-left-radius: 2px; }
        
        .msg-time { font-size: 0.7rem; color: var(--text-muted); margin-top: 3px; align-self: flex-end; padding: 0 4px; }
        .msg-row.received .msg-time { align-self: flex-start; }

        .chat-input-area { padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; gap: 1rem; background: var(--card-bg); }
        .chat-input-area input { flex: 1; height: 44px; border-radius: 22px; padding: 0 1.25rem; }
        
        @media (max-width: 768px) {
          .chat-container { height: calc(100vh - 120px); gap: 0; }
          .chat-sidebar { display: ${activeContact ? 'none' : 'flex'}; width: 100%; flex: auto; }
          .chat-main { display: ${activeContact ? 'flex' : 'none'}; width: 100%; }
        }
      `}</style>

      {/* Left conversation list */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          {lang === 'vi' ? 'Trò chuyện' : 'Inbox'}
        </div>
        
        <div className="chat-contacts-list">
          {loadingContacts && contacts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{lang === 'vi' ? 'Đang tải liên hệ...' : 'Loading contacts...'}</div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {lang === 'vi' ? 'Chưa có cuộc hội thoại nào. Bạn có thể bắt đầu nhắn tin từ trang cá nhân của các thành viên khác!' : 'No conversations yet. You can start chatting from other members\' profiles!'}
            </div>
          ) : (
            contacts.map(c => (
              <div 
                key={c.user.id} 
                className={`contact-item ${activeContact && activeContact.id === c.user.id ? 'active' : ''}`}
                onClick={() => setActiveContact(c.user)}
              >
                <div className="chat-avatar-wrap">
                  <img src={c.user.avatar || '/uploads/avatar_default.png'} className="avatar-chat" alt={c.user.full_name} />
                </div>
                
                <div className="contact-info">
                  <div className="contact-name">
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.user.full_name}</span>
                    {c.unreadCount > 0 && <span className="badge-unread">{c.unreadCount}</span>}
                  </div>
                  <div className="last-message">
                    {c.lastMessage ? (
                      c.lastMessage.sender_id === user.id ? (lang === 'vi' ? `Bạn: ${c.lastMessage.content}` : `You: ${c.lastMessage.content}`) : c.lastMessage.content
                    ) : (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{lang === 'vi' ? 'Chưa có tin nhắn' : 'No messages'}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Right chat message thread */}
      <main className="chat-main">
        {activeContact ? (
          <>
            {/* Header */}
            <div className="chat-header">
              {/* Back button visible on mobile */}
              <button 
                className="btn btn-ghost" 
                style={{ padding: '0.4rem', marginRight: '0.5rem', display: 'none' }}
                onClick={() => setActiveContact(null)}
                id="chatMobileBackBtn"
              >
                &larr;
              </button>
              <style>{`
                @media (max-width: 768px) { #chatMobileBackBtn { display: inline-block !important; } }
              `}</style>

              <img src={activeContact.avatar || '/uploads/avatar_default.png'} className="avatar-chat" style={{ width: '36px', height: '36px' }} alt={activeContact.full_name} />
              <div>
                <h3>{activeContact.full_name}</h3>
                <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>@{activeContact.username} &bull; {activeContact.role === 'teacher' ? (lang === 'vi' ? 'Giáo viên' : 'Teacher') : activeContact.role === 'student' ? (lang === 'vi' ? 'Sinh viên' : 'Student') : (lang === 'vi' ? 'Quản trị viên' : 'Admin')}</span>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="chat-thread" ref={threadContainerRef}>
              {loadingHistory && messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{lang === 'vi' ? 'Đang tải lịch sử tin nhắn...' : 'Loading chat history...'}</div>
              ) : (
                Object.keys(groupedMsgs).map(dateStr => (
                  <React.Fragment key={dateStr}>
                    <div className="date-divider">{dateStr}</div>
                    {groupedMsgs[dateStr].map(msg => {
                      const isSent = msg.sender_id === user.id;
                      return (
                        <div key={msg.id} className={`msg-row ${isSent ? 'sent' : 'received'}`}>
                          <div className="msg-bubble-wrap">
                            <div className="msg-bubble">{msg.content}</div>
                            <div className="msg-time">{formatTime(msg.created_at)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="chat-input-area">
              <input 
                type="text" 
                className="form-control" 
                placeholder={lang === 'vi' ? 'Nhập tin nhắn...' : 'Type a message...'} 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                required
                autoComplete="off"
              />
              <button type="submit" className="btn btn-primary" style={{ height: '44px', borderRadius: '22px', padding: '0 1.5rem' }}>{lang === 'vi' ? 'Gửi' : 'Send'}</button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
            <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '48px', height: '48px', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.114 1.5 2.078v6.375c0 .964-.616 1.794-1.5 2.078M1.5 10.589c-.884.284-1.5 1.114-1.5 2.078v6.375c0 .964.616 1.794 1.5 2.078m0 0a.75.75 0 03.75-.75h19.5a.75.75 0 03.75.75m-21 0v-11.25A2.25 2.25 0 013.75 4.5h16.5a2.25 2.25 0 012.25 2.25v11.25m-18 0V9M3 9h18M6 12h.008v.008H6V12zm0 3h.008v.008H6V15zm3-3h.008v.008H9V12zm0 3h.008v.008H9V15z"></path>
            </svg>
            <p>{lang === 'vi' ? 'Chọn một liên hệ từ danh sách bên trái để bắt đầu cuộc trò chuyện.' : 'Select a contact from the list on the left to start a conversation.'}</p>
          </div>
        )}
      </main>
    </div>
  );
}
