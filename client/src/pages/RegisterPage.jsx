import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap } from 'lucide-react';
import client from '../api/client';
import EmailPasswordForm from '../components/EmailPasswordForm';

const RegisterPage = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async ({ email, password, display_name, turnstileToken }) => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await client.post('/auth/student/register', {
        email,
        password,
        display_name,
        turnstileToken
      });

      const { token, user } = res.data.data;
      login(token, user);
      
      // Navigate to username setup since it's a new password account
      navigate('/set-username');
    } catch (err) {
      console.error('Registration error:', err);
      const code = err.response?.data?.error?.code;
      let msg = '';

      switch (code) {
        case 'EMAIL_ALREADY_EXISTS':
          msg = 'An account with this Gmail already exists. Try signing in instead.';
          break;
        case 'INVALID_EMAIL_DOMAIN':
          msg = t('auth.gmailOnlyNote');
          break;
        case 'WEAK_PASSWORD':
          msg = 'Password must be at least 8 characters long.';
          break;
        case 'TURNSTILE_FAILED':
        case 'TURNSTILE_REQUIRED':
          msg = 'Verification failed, please try the checkbox again.';
          break;
        case 'RATE_LIMITED':
          msg = 'Too many attempts, please wait a few minutes and try again.';
          break;
        default:
          msg = err.response?.data?.error?.message || 'Registration failed, please try again.';
          break;
      }
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="auth-header">
        <GraduationCap className="auth-logo" />
        <h2 className="auth-title">Research 4 Student</h2>
        <p className="auth-subtitle">Create your student account</p>
      </div>

      {errorMsg && (
        <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', textAlign: 'center', margin: '8px 0', fontWeight: '600' }}>
          {errorMsg}
        </div>
      )}

      <EmailPasswordForm 
        mode="register" 
        submitLabel={t('auth.register')} 
        onSubmit={handleRegister} 
        submitting={submitting} 
      />

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <NavLink to="/login" className="back-link" style={{ color: 'var(--color-text-secondary)' }}>
          {t('auth.haveAccount')}
        </NavLink>
      </div>
    </>
  );
};

export default RegisterPage;
