import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap } from 'lucide-react';
import client from '../api/client';

const TeacherLoginPage = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await client.post('/auth/teacher/login', { email, password });
      const { token, user, mustChangePassword } = res.data.data;

      login(token, user);

      if (mustChangePassword) {
        navigate('/teacher/change-password');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Teacher login error:', err);
      const errMsg = err.response?.data?.error?.message || 'Invalid email or password. Please try again.';
      setErrorMsg(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="auth-header">
        <GraduationCap className="auth-logo" />
        <h2 className="auth-title">{t('teacherLogin.title')}</h2>
        <p className="auth-subtitle">{t('teacherLogin.subtitle')}</p>
      </div>

      {errorMsg && (
        <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', textAlign: 'center', margin: '4px 0' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
        <div className="form-group">
          <label className="form-label">{t('auth.email')}</label>
          <input
            type="email"
            className="form-input"
            placeholder="teacher@fpt.edu.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={submitting}
          />
        </div>
        <div className="form-group">
          <label className="form-label">{t('auth.password')}</label>
          <input
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={submitting}
          />
        </div>
        <button
          type="submit"
          className="submit-btn"
          style={{ marginTop: '8px' }}
          disabled={submitting}
        >
          {submitting ? t('teacherLogin.signingIn') : t('teacherLogin.loginBtn')}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <NavLink to="/login" className="back-link">
          {t('teacherLogin.backToStudent')}
        </NavLink>
      </div>
    </>
  );
};

export default TeacherLoginPage;
