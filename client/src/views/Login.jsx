import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg(lang === 'vi' ? 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' : 'Please fill in both username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || (lang === 'vi' ? 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.' : 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main-content auth-container">
      {/* Inject Scoped Styles */}
      <style>{`
        .auth-container { display:flex; justify-content:center; align-items:center; min-height:calc(100vh - 140px); padding:2rem 1rem; }
        .auth-card { background-color:var(--card-bg); border:1px solid var(--border-color); border-radius:20px; padding:3rem 2.5rem; width:100%; max-width:460px; box-shadow:var(--shadow-lg); }
        .auth-header { text-align:center; margin-bottom:2.5rem; }
        .auth-header h1 { font-size:1.75rem; margin-top:1.5rem; display:flex; align-items:baseline; justify-content:center; gap:8px; }
        .auth-header p { color:var(--text-secondary); margin-top:0.5rem; }
        .input-wrapper { position:relative; }
        .password-toggle { position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); color:var(--text-secondary); display:flex; align-items:center; padding:0.25rem; border-radius:6px; cursor:pointer; background: none; border: none; }
        .password-toggle:hover { color:var(--text-primary); background-color:var(--bg-secondary); }
        .password-toggle svg { width:20px; height:20px; }
        .auth-footer { text-align:center; margin-top:2rem; color:var(--text-secondary); font-size:0.95rem; }
        .auth-footer a { color:var(--accent); font-weight:600; margin-left:0.25rem; }
      `}</style>

      <div className="auth-card">
        <div className="auth-header">
          {/* Logo SVG (layers icon, accent color) */}
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <h1>{lang === 'vi' ? 'Đăng nhập' : 'Login'}</h1>
          <p>{lang === 'vi' ? 'Chào mừng trở lại Research 4 Students.' : 'Welcome back to Research 4 Students.'}</p>
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

        <form id="loginForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <div>{lang === 'vi' ? 'Tên người dùng' : 'Username'}</div>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder={lang === 'vi' ? 'tên đăng nhập' : 'username'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <div>{lang === 'vi' ? 'Mật khẩu' : 'Password'}</div>
            </label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                style={{ paddingRight: '2.8rem' }}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {/* password toggle button with eye/eye-slash SVG icons */}
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"></path>
                  </svg>
                ) : (
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? (lang === 'vi' ? 'Đang đăng nhập...' : 'Signing in...') : (lang === 'vi' ? 'Đăng nhập' : 'Log In')}
          </button>
        </form>

        <div className="auth-footer">
          {lang === 'vi' ? 'Chưa có tài khoản?' : "Don't have an account?"} <Link to="/register">{lang === 'vi' ? 'Đăng ký ngay' : 'Sign up'}</Link>
        </div>
      </div>
    </main>
  );
}
