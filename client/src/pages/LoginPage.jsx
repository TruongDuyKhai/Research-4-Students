import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useFeatures } from '../contexts/FeaturesContext';
import { GraduationCap } from 'lucide-react';
import client from '../api/client';
import EmailPasswordForm from '../components/EmailPasswordForm';

const LoginPage = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { features } = useFeatures();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCredentialResponse = async (response) => {
    try {
      setErrorMsg('');
      const res = await client.post('/auth/google', { credential: response.credential });
      const { token, user, needsUsername } = res.data.data;

      login(token, user);

      if (needsUsername) {
        navigate('/set-username');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Google login backend error:', err);
      const errMsg = err.response?.data?.error?.message || 'Failed to authenticate with Google. Please try again.';
      setErrorMsg(errMsg);
    }
  };

  const handleEmailLogin = async ({ email, password, turnstileToken }) => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await client.post('/auth/student/login', {
        email,
        password,
        turnstileToken
      });

      const { token, user, needsUsername } = res.data.data;
      login(token, user);

      if (needsUsername) {
        navigate('/set-username');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Email login error:', err);
      const code = err.response?.data?.error?.code;
      let msg = '';

      switch (code) {
        case 'INVALID_CREDENTIALS':
          msg = 'Invalid email or password.';
          break;
        case 'ACCOUNT_BANNED':
          msg = 'This account has been banned.';
          break;
        case 'RATE_LIMITED':
          msg = 'Too many attempts, please wait a few minutes and try again.';
          break;
        case 'TURNSTILE_FAILED':
        case 'TURNSTILE_REQUIRED':
          msg = 'Verification failed, please try the checkbox again.';
          break;
        default:
          msg = err.response?.data?.error?.message || 'Login failed, please try again.';
          break;
      }
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!features.googleAuth || !import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      return;
    }

    const initializeGoogleSignIn = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.warn('VITE_GOOGLE_CLIENT_ID is not configured in client environment.');
      }

      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse
        });
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          { theme: 'outline', size: 'large', text: 'signin_with' }
        );
      } else {
        // script is not ready, retry in 100ms
        setTimeout(initializeGoogleSignIn, 100);
      }
    };

    initializeGoogleSignIn();
  }, [features.googleAuth]);

  return (
    <>
      <div className="auth-header">
        <GraduationCap className="auth-logo" />
        <h2 className="auth-title">Research 4 Student</h2>
        <p className="auth-subtitle">Welcome! Please sign in with your student Google account</p>
      </div>

      {errorMsg && (
        <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', textAlign: 'center', margin: '8px 0', fontWeight: '600' }}>
          {errorMsg}
        </div>
      )}

      {/* Google Sign-In & Divider (conditionally rendered) */}
      {features.googleAuth && import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
        <>
          {/* Google Sign-In Container */}
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginTop: '16px', 
              marginBottom: '8px' 
            }}
          >
            <div ref={googleButtonRef}></div>
          </div>

          {/* Text Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0 16px', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
            <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
            <span style={{ padding: '0 12px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>{t('auth.orDivider')}</span>
            <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
          </div>
        </>
      ) : null}

      {/* Email + Password Form */}
      <EmailPasswordForm 
        mode="login" 
        submitLabel={t('auth.loginWithEmail')} 
        onSubmit={handleEmailLogin} 
        submitting={submitting} 
      />

      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          textAlign: 'center', 
          marginTop: '24px' 
        }}
      >
        <NavLink to="/register" className="login-link" style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
          {t('auth.noAccount')}
        </NavLink>

        <NavLink to="/teacher-login" className="login-link">
          Are you a teacher? Login here
        </NavLink>
      </div>
    </>
  );
};

export default LoginPage;
