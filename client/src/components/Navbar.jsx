import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { toggleTheme } from '../utils/theme';
import SearchOverlay from './SearchOverlay';
import NotificationPanel from './NotificationPanel';
import { useLang } from '../context/LanguageContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const { lang, toggleLang } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(
    document.documentElement.getAttribute('data-theme') || 'dark'
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleThemeToggle = () => {
    const nextTheme = toggleTheme();
    setCurrentTheme(nextTheme);
  };

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  // Close dropdown on location change
  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    // Highlight aliases as active
    if (path === '/research/documents' && location.pathname.startsWith('/documents')) return true;
    if (path === '/research/qa' && location.pathname.startsWith('/qa')) return true;
    if (path === '/research/reviews' && location.pathname.startsWith('/reviews')) return true;
    return false;
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          {/* Logo with matching SVG from demo */}
          <Link to="/" className="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="var(--accent)"/>
              <path d="M2 17L12 22L22 17" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Research 4 <span>Students</span>
          </Link>

          {/* Navigation Links */}
          <div className="nav-links">
            <Link to="/community" className={`nav-link ${isActive('/community') ? 'active' : ''}`}>
              {lang === 'vi' ? 'Cộng đồng' : 'Community'}
            </Link>
            <Link to="/research/documents" className={`nav-link ${isActive('/research/documents') ? 'active' : ''}`}>
              {lang === 'vi' ? 'Tài liệu' : 'Documents'}
            </Link>
            <Link to="/research/qa" className={`nav-link ${isActive('/research/qa') ? 'active' : ''}`}>
              {lang === 'vi' ? 'Hỏi đáp' : 'Q&A'}
            </Link>
            <Link to="/research/reviews" className={`nav-link ${isActive('/research/reviews') ? 'active' : ''}`}>
              {lang === 'vi' ? 'Đánh giá' : 'Reviews'}
            </Link>
          </div>

          {/* Actions Bar */}
          <div className="nav-actions">
            
            {/* Search Icon */}
            <button className="icon-btn" onClick={() => setSearchOpen(true)} title="Tìm kiếm (Search)">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </button>

            {/* Theme Toggle */}
            <button className="icon-btn" onClick={handleThemeToggle} title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}>
              {currentTheme === 'light' ? (
                // Moon icon (light mode implies switching to dark)
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
              ) : (
                // Sun icon
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path>
                </svg>
              )}
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="icon-btn"
              title="Switch language"
              style={{ fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.05em' }}
            >
              {lang === 'vi' ? 'EN' : 'VI'}
            </button>

            {/* Notification Bell (Only if logged in) */}
            {user && (
              <button className="icon-btn" onClick={() => setNotifOpen(true)} title="Thông báo (Notifications)">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: 'var(--error-color)',
                    color: 'white',
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    lineHeight: '1'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* User Dropdown / Auth Buttons */}
            {user ? (
              <div style={{ position: 'relative' }}>
                <img
                  src={user.avatar || '/uploads/avatar_default.png'}
                  alt={user.full_name}
                  className="nav-avatar"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                />
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '50px',
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.5rem 0',
                    width: '240px',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    textAlign: 'left'
                  }}>
                    {/* User profile preview */}
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{user.full_name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>@{user.username}</div>
                      <div className="role-badge" style={{ marginTop: '6px', fontSize: '0.7rem', padding: '2px 8px' }}>{user.role}</div>
                    </div>

                    <Link 
                      to="/dashboard" 
                      style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span>{lang === 'vi' ? 'Bảng điều khiển' : 'Dashboard'}</span>
                    </Link>

                    <Link 
                      to="/profile" 
                      style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span>{lang === 'vi' ? 'Hồ sơ cá nhân' : 'Profile'}</span>
                    </Link>

                    {user.role === 'admin' && (
                      <Link 
                        to="/admin/dashboard" 
                        style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', color: 'var(--accent)', display: 'flex', justifyContent: 'space-between' }}
                      >
                        <span>{lang === 'vi' ? 'Quản trị' : 'Admin Panel'}</span>
                      </Link>
                    )}

                    <button 
                      onClick={handleLogout}
                      style={{ 
                        padding: '0.6rem 1rem', 
                        fontSize: '0.9rem', 
                        color: 'var(--error-color)', 
                        textAlign: 'left',
                        width: '100%',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{lang === 'vi' ? 'Đăng xuất' : 'Logout'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to="/login" className="btn btn-ghost" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>
                  {lang === 'vi' ? 'Đăng nhập' : 'Log In'}
                </Link>
                <Link to="/register" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>
                  {lang === 'vi' ? 'Đăng ký' : 'Sign Up'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Overlays */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
