import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

export default function Register() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(''); // 'student' or 'teacher'
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [major, setMajor] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successState, setSuccessState] = useState(''); // 'teacher_pending' or 'registration_closed'
  
  // Username check state
  const [usernameStatus, setUsernameStatus] = useState('none'); // 'none' | 'checking' | 'available' | 'taken'
  const usernameTimeoutRef = useRef(null);

  const { register } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

  // Handle Username availability check
  const checkUsernameAvailability = async (uname) => {
    if (!uname || uname.trim().length < 3) {
      setUsernameStatus('none');
      return;
    }
    setUsernameStatus('checking');
    try {
      const res = await axios.get(`/api/users/check-username?username=${encodeURIComponent(uname.trim())}`);
      if (res.data.available) {
        setUsernameStatus('available');
      } else {
        setUsernameStatus('taken');
      }
    } catch (err) {
      console.error(err);
      setUsernameStatus('none');
    }
  };

  // Debounced check on input typing
  useEffect(() => {
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }

    if (username) {
      usernameTimeoutRef.current = setTimeout(() => {
        checkUsernameAvailability(username);
      }, 500);
    } else {
      setUsernameStatus('none');
    }

    return () => {
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }
    };
  }, [username]);

  // Blur handler to verify immediately
  const handleUsernameBlur = () => {
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }
    checkUsernameAvailability(username);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName || !username || !email || !password || !role) {
      setErrorMsg(lang === 'vi' ? 'Vui lòng điền đầy đủ các thông tin bắt buộc.' : 'Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg(lang === 'vi' ? 'Mật khẩu phải chứa ít nhất 6 ký tự.' : 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(lang === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
      return;
    }

    if (usernameStatus === 'taken') {
      setErrorMsg(lang === 'vi' ? 'Tên người dùng đã được đăng ký.' : 'Username already registered.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        full_name: fullName,
        username,
        email,
        password,
        role,
        major
      });

      if (res && res.message === 'Awaiting admin approval') {
        setSuccessState('teacher_pending');
      } else {
        // Successful Student registration auto-logs in and redirects to '/'
        navigate('/');
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.error === 'Registration is currently closed') {
        setSuccessState('registration_closed');
      } else {
        setErrorMsg(err.message || (lang === 'vi' ? 'Đăng ký thất bại. Tên đăng nhập hoặc email có thể đã tồn tại.' : 'Registration failed. Username or email may already exist.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main-content auth-container">
      {/* Inject Scoped Styles */}
      <style>{`
        .auth-container { display:flex; justify-content:center; align-items:center; min-height:calc(100vh - 140px); padding:2rem 1rem; }
        .auth-card { background-color:var(--card-bg); border:1px solid var(--border-color); border-radius:20px; padding:3rem 2.5rem; width:100%; max-width:550px; box-shadow:var(--shadow-lg); }
        .auth-header { text-align:center; margin-bottom:2.5rem; }
        .auth-header h1 { font-size:1.75rem; margin-top:1.5rem; display:flex; align-items:baseline; justify-content:center; gap:8px; }
        .auth-header p { color:var(--text-secondary); margin-top:0.5rem; }
        .input-wrapper { position:relative; }
        .password-toggle { position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); color:var(--text-secondary); display:flex; align-items:center; padding:0.25rem; border-radius:6px; cursor:pointer; background:none; border:none; }
        .password-toggle:hover { color:var(--text-primary); background-color:var(--bg-secondary); }
        .password-toggle svg { width:20px; height:20px; }
        .auth-footer { text-align:center; margin-top:2rem; color:var(--text-secondary); font-size:0.95rem; }
        .auth-footer a { color:var(--accent); font-weight:600; margin-left:0.25rem; }
        .role-select-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin:1.5rem 0; }
        .role-card { border:2px solid var(--border-color); border-radius:12px; padding:2rem 1.5rem; text-align:center; cursor:pointer; transition:all 0.2s; background-color: var(--bg-primary); }
        .role-card:hover { border-color:var(--accent); background:var(--accent-light); }
        .role-card.selected { border-color:var(--accent); background:var(--accent-light); }
        .role-card svg { width:40px; height:40px; color:var(--accent); margin:0 auto 1rem; }
        .role-card h3 { font-size:1.1rem; margin-bottom:0.25rem; color:var(--text-primary); }
        .role-card p { font-size:0.85rem; color:var(--text-secondary); }
      `}</style>

      <div className="auth-card">
        {/* Render Success: Teacher Pending Approval Screen */}
        {successState === 'teacher_pending' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
              border: '2px solid var(--accent)'
            }}>
              {/* Amber checkmark icon */}
              <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              {lang === 'vi' ? 'Tài khoản đang chờ duyệt' : 'Account Pending Approval'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
              {lang === 'vi' 
                ? 'Yêu cầu đăng ký tài khoản giảng viên của bạn đã được tiếp nhận và đang chờ ban quản trị phê duyệt.' 
                : 'Your lecturer registration has been received and is currently awaiting administrator approval.'}
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
              {lang === 'vi' ? 'Quay lại đăng nhập' : 'Back to Login'}
            </Link>
          </div>
        )}

        {/* Render Success: Registration Closed Screen */}
        {successState === 'registration_closed' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--error-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
              border: '2px solid var(--error-color)'
            }}>
              {/* Lock icon */}
              <svg style={{ width: '30px', height: '30px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"></path>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              {lang === 'vi' ? 'Đăng ký tạm đóng' : 'Registration Closed'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2.5rem' }}>
              {lang === 'vi' 
                ? 'Hiện tại số lượng tài khoản trên hệ thống đã đạt giới hạn tối đa. Cổng đăng ký tạm thời được đóng lại.' 
                : 'Registration is currently closed because the maximum account limit has been reached.'}
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
              {lang === 'vi' ? 'Quay lại đăng nhập' : 'Back to Login'}
            </Link>
          </div>
        )}

        {/* Render Step 1: Role Selection */}
        {!successState && step === 1 && (
          <div>
            <div className="auth-header">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              <h1>{lang === 'vi' ? 'Đăng ký tài khoản' : 'Create Account'}</h1>
              <p>{lang === 'vi' ? 'Chọn vai trò của bạn để tiếp tục đăng ký.' : 'Choose your role to continue registration.'}</p>
            </div>

            <div className="role-select-grid">
              <div 
                className={`role-card ${role === 'student' ? 'selected' : ''}`}
                onClick={() => setRole('student')}
              >
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.263 15.541A22.89 22.89 0 0012 16.83a22.89 22.89 0 007.737-1.289m-15.474 0a22.905 22.905 0 01-3.001-1.206m3.002 1.206a2.25 2.25 0 011.196-1.254l1.637-.818a4.492 4.492 0 014.21-.034l1.62.81a2.25 2.25 0 011.2 1.253M0 13c0-1.1.9-2 2-2h20a2 2 0 012 2v8a2 2 0 01-2 2H2a2 2 0 01-2-2v-8z"></path>
                </svg>
                <h3>{lang === 'vi' ? 'Sinh viên' : 'Student'}</h3>
                <p>{lang === 'vi' ? 'Nghiên cứu viên tìm kiếm dự án' : 'Student researcher seeking projects'}</p>
              </div>

              <div 
                className={`role-card ${role === 'teacher' ? 'selected' : ''}`}
                onClick={() => setRole('teacher')}
              >
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"></path>
                </svg>
                <h3>{lang === 'vi' ? 'Giảng viên' : 'Lecturer'}</h3>
                <p>{lang === 'vi' ? 'Người hướng dẫn đăng dự án' : 'Advisor proposing research projects'}</p>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={!role}
              onClick={() => setStep(2)}
            >
              {lang === 'vi' ? 'Tiếp tục' : 'Continue'}
            </button>

            <div className="auth-footer">
              {lang === 'vi' ? 'Đã có tài khoản?' : 'Already have an account?'} <Link to="/login">{lang === 'vi' ? 'Đăng nhập' : 'Log in'}</Link>
            </div>
          </div>
        )}

        {/* Render Step 2: Form Input */}
        {!successState && step === 2 && (
          <div>
            <div className="auth-header">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              <h1>{lang === 'vi' ? 'Thông tin đăng ký' : 'Registration Info'}</h1>
              <p>
                {lang === 'vi' 
                  ? `Đăng ký tài khoản ${role === 'student' ? 'Sinh viên' : 'Giảng viên'}` 
                  : `Register as ${role === 'student' ? 'Student' : 'Lecturer'}`}
              </p>
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

            <form id="registerForm" onSubmit={handleSubmit}>
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">
                  <div>{lang === 'vi' ? 'Họ và tên thật' : 'Full Name'}</div>
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={lang === 'vi' ? 'Nguyễn Văn A' : 'John Doe'} 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* Username */}
              <div className="form-group">
                <label className="form-label">
                  <div>{lang === 'vi' ? 'Tên người dùng' : 'Username'}</div>
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className={`form-control ${
                      usernameStatus === 'available' ? 'is-valid' : 
                      usernameStatus === 'taken' ? 'is-invalid' : ''
                    }`} 
                    placeholder={lang === 'vi' ? 'tên đăng nhập' : 'username'} 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={handleUsernameBlur}
                    required
                  />
                  {usernameStatus === 'checking' && (
                    <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {lang === 'vi' ? 'Đang kiểm tra...' : 'Checking...'}
                    </span>
                  )}
                  {usernameStatus === 'available' && (
                    <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--success-color)' }} title={lang === 'vi' ? 'Tên người dùng khả dụng' : 'Username available'}>
                      ✓
                    </span>
                  )}
                  {usernameStatus === 'taken' && (
                    <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--error-color)' }} title={lang === 'vi' ? 'Tên người dùng đã được sử dụng' : 'Username already taken'}>
                      &times;
                    </span>
                  )}
                </div>
                {usernameStatus === 'taken' && (
                  <div className="error-message show" style={{ fontSize: '0.75rem', color: 'var(--error-color)' }}>
                    {lang === 'vi' ? 'Tên người dùng đã được sử dụng' : 'Username already taken'}
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">
                  <div>Email</div>
                </label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="email@university.edu" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">
                  <div>{lang === 'vi' ? 'Mật khẩu' : 'Password'}</div>
                </label>
                <div className="input-wrapper">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="form-control" 
                    style={{ paddingRight: '2.8rem' }} 
                    placeholder={lang === 'vi' ? 'Tối thiểu 6 ký tự' : 'Min 6 characters'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
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

              {/* Confirm Password */}
              <div className="form-group">
                <label className="form-label">
                  <div>{lang === 'vi' ? 'Xác nhận mật khẩu' : 'Confirm Password'}</div>
                </label>
                <div className="input-wrapper">
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    className="form-control" 
                    style={{ paddingRight: '2.8rem' }} 
                    placeholder={lang === 'vi' ? 'Nhập lại mật khẩu' : 'Confirm password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex="-1"
                  >
                    {showConfirmPassword ? (
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

              {/* Teacher fields: Major/Department */}
              {role === 'teacher' && (
                <div className="form-group">
                  <label className="form-label">
                    <div>{lang === 'vi' ? 'Khoa / Ngành' : 'Major / Department'}</div>
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder={lang === 'vi' ? 'e.g. Khoa Khoa học máy tính' : 'e.g. Faculty of Computer Science'} 
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                  onClick={() => setStep(1)}
                >
                  {lang === 'vi' ? 'Quay lại' : 'Back'}
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  {loading ? (lang === 'vi' ? 'Đang đăng ký...' : 'Registering...') : (lang === 'vi' ? 'Đăng ký' : 'Register')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
