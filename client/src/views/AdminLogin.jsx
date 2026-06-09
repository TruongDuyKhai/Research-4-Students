import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { lang } = useLang();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg(lang === 'vi' ? 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' : 'Please enter username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.post('/api/admin/login', { username, password });
      const { token } = res.data;

      // Store admin token separately from the regular user session
      localStorage.setItem('adminToken', token);

      navigate('/admin/dashboard');
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error ||
        (lang === 'vi' ? 'Đăng nhập Admin thất bại. Vui lòng kiểm tra lại thông tin.' : 'Admin login failed. Please verify your credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main-content auth-container">
      <style>{`
        .auth-container { display:flex; justify-content:center; align-items:center; min-height:calc(100vh - 140px); padding:2rem 1rem; }
        .auth-card { background-color:var(--card-bg); border:1px solid var(--border-color); border-radius:20px; padding:3rem 2.5rem; width:100%; max-width:440px; box-shadow:var(--shadow-lg); }
        .auth-header { text-align:center; margin-bottom:2.5rem; }
        .auth-header h1 { font-size:1.6rem; margin-top:1.5rem; display:flex; align-items:baseline; justify-content:center; gap:8px; color: var(--accent); }
        .auth-header p { color:var(--text-secondary); margin-top:0.5rem; font-size:0.9rem; }
        .auth-footer { text-align:center; margin-top:2rem; color:var(--text-secondary); font-size:0.9rem; }
        .auth-footer a { color:var(--accent); font-weight:600; }
      `}</style>

      <div className="auth-card">
        <div className="auth-header">
          {/* Admin Gear/Security Icon */}
          <svg width="48" height="48" fill="none" stroke="var(--accent)" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
          </svg>
          <h1>{lang === 'vi' ? 'Quản trị viên' : 'Admin Login'}</h1>
          <p>{lang === 'vi' ? 'Nhập thông tin xác thực quản trị hệ thống.' : 'Enter system administration credentials.'}</p>
        </div>

        {errorMsg && (
          <div className="error-message show" style={{
            padding: '0.8rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--error-color)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg style={{ width: '16px', height: '16px', flexShrink: 0, color: 'var(--error-color)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              {lang === 'vi' ? 'Tên đăng nhập' : 'Admin Username'}
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {lang === 'vi' ? 'Mật khẩu quản trị' : 'Password'}
            </label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem', backgroundColor: 'var(--accent)', color: '#0f1117' }}
            disabled={loading}
          >
            {loading ? (lang === 'vi' ? 'Đang xác thực...' : 'Authenticating...') : (lang === 'vi' ? 'Đăng nhập hệ thống' : 'Login')}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/">{lang === 'vi' ? 'Quay lại Trang chủ' : 'Back to Home'}</Link>
        </div>
      </div>
    </main>
  );
}
