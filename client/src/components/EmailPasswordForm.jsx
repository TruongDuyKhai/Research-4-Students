import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import Turnstile from './Turnstile';

const EmailPasswordForm = ({ mode, onSubmit, submitting, submitLabel }) => {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Email domain validation (gmail.com or googlemail.com, case insensitive)
    const gmailRegex = /^[^\s@]+@(gmail\.com|googlemail\.com)$/i;
    if (!gmailRegex.test(email)) {
      setErrorMsg(t('auth.gmailOnlyNote'));
      return;
    }

    if (mode === 'register') {
      // 2. Display Name validation
      if (!displayName.trim()) {
        setErrorMsg('Display name is required.');
        return;
      }

      // 3. Password length check
      if (password.length < 8) {
        setErrorMsg('Password must be at least 8 characters');
        return;
      }

      // 4. Password confirmation check
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }
    }

    // 5. Turnstile validation
    if (!turnstileToken) {
      setErrorMsg('Please complete the security checkbox verification.');
      return;
    }

    const values = {
      email,
      password,
      turnstileToken
    };

    if (mode === 'register') {
      values.display_name = displayName.trim();
    }

    await onSubmit(values);
  };

  return (
    <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
      
      {errorMsg && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: 'var(--color-danger)', 
          fontSize: '0.875rem', 
          backgroundColor: '#FEF2F2', 
          padding: '10px 12px', 
          borderRadius: 'var(--radius-md)',
          border: '1px solid #FCA5A5'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Display Name (Register mode only) */}
      {mode === 'register' && (
        <div className="form-group">
          <label className="form-label">{t('auth.displayName')} *</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. John Doe"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            disabled={submitting}
          />
        </div>
      )}

      {/* Email Input */}
      <div className="form-group">
        <label className="form-label">{t('auth.email')} *</label>
        <input 
          type="email" 
          className="form-input" 
          placeholder="your.email@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={submitting}
        />
        {mode === 'register' && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
            {t('auth.gmailOnlyNote')}
          </p>
        )}
      </div>

      {/* Password Input */}
      <div className="form-group">
        <label className="form-label">{t('auth.password')} *</label>
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

      {/* Confirm Password (Register mode only) */}
      {mode === 'register' && (
        <div className="form-group">
          <label className="form-label">{t('auth.confirmPassword')} *</label>
          <input 
            type="password" 
            className="form-input" 
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={submitting}
          />
        </div>
      )}

      {/* Cloudflare Turnstile Captcha Widget */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <Turnstile onVerify={(token) => setTurnstileToken(token)} />
      </div>

      {/* Submit Action Button */}
      <button 
        type="submit" 
        className="submit-btn" 
        style={{ marginTop: '8px' }}
        disabled={submitting || !turnstileToken}
      >
        {submitting ? 'Please wait...' : submitLabel}
      </button>

    </form>
  );
};

export default EmailPasswordForm;
