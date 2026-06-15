import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import client from '../api/client';

const TeacherChangePasswordPage = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Client-side validations
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New password and confirmation password do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await client.post('/auth/change-password', { currentPassword, newPassword });
      setSuccessMsg('Password changed successfully! Redirecting...');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      console.error('Password change error:', err);
      const errMsg = err.response?.data?.error?.message || 'Failed to change password. Please check your current password.';
      setErrorMsg(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="auth-header">
        <GraduationCap className="auth-logo" />
        <h2 className="auth-title">Change Password</h2>
        <p className="auth-subtitle">Please set a new secure password to proceed</p>
      </div>

      {errorMsg && (
        <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', textAlign: 'center', margin: '4px 0' }}>
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ color: 'var(--color-success)', fontSize: '0.875rem', textAlign: 'center', margin: '4px 0', fontWeight: 'bold' }}>
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
        <div className="form-group">
          <label className="form-label">Current Password</label>
          <input 
            type="password" 
            className="form-input" 
            placeholder="••••••••" 
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={submitting}
          />
        </div>
        <div className="form-group">
          <label className="form-label">New Password</label>
          <input 
            type="password" 
            className="form-input" 
            placeholder="••••••••" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={submitting}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input 
            type="password" 
            className="form-input" 
            placeholder="••••••••" 
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
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
          {submitting ? 'Updating...' : 'Change Password'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <NavLink to="/" className="back-link">
          Cancel & Return Home
        </NavLink>
      </div>
    </>
  );
};

export default TeacherChangePasswordPage;
