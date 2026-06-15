import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap } from 'lucide-react';
import client from '../api/client';

const SetUsernamePage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [available, setAvailable] = useState(null); // null, true, false
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const debounceRef = useRef(null);

  // Redirect if already has username or not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.username) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleUsernameChange = (e) => {
    const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''); // strip spaces/specials
    setUsername(val);
    setAvailable(null);
    setErrorMsg('');

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (val.length < 3) {
      return;
    }

    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await client.get(`/users/check-username?value=${val}`);
        setAvailable(res.data.data.available);
      } catch (err) {
        console.error('Check username error:', err);
        setAvailable(false);
      } finally {
        setChecking(false);
      }
    }, 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!available || username.length < 3) {
      setErrorMsg('Please choose a valid and available username.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await client.put('/users/me/username', { username });
      const updatedUser = res.data.data;
      updateUser(updatedUser);
      navigate('/');
    } catch (err) {
      console.error('Failed to set username:', err);
      const errMsg = err.response?.data?.error?.message || 'Encountered an error while saving username.';
      setErrorMsg(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="auth-header">
        <GraduationCap className="auth-logo" />
        <h2 className="auth-title">Set Username</h2>
        <p className="auth-subtitle">Please select a unique username for your profile</p>
      </div>

      {errorMsg && (
        <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', textAlign: 'center', margin: '4px 0' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. johndoe" 
            value={username}
            onChange={handleUsernameChange}
            maxLength={20}
            required
            disabled={submitting}
          />
          <div style={{ fontSize: '0.825rem', marginTop: '4px', minHeight: '1.25rem' }}>
            {checking && <span style={{ color: 'var(--color-text-secondary)' }}>Checking availability...</span>}
            {!checking && available === true && <span style={{ color: 'var(--color-success)' }}>✓ Username is available</span>}
            {!checking && available === false && <span style={{ color: 'var(--color-danger)' }}>✗ Username is already taken</span>}
            {username.length > 0 && username.length < 3 && <span style={{ color: 'var(--color-text-secondary)' }}>Username must be at least 3 characters</span>}
          </div>
        </div>
        
        <button 
          type="submit" 
          className="submit-btn" 
          disabled={submitting || available !== true}
          style={{ marginTop: '8px', opacity: (available === true && !submitting) ? 1 : 0.6 }}
        >
          {submitting ? 'Saving...' : 'Set Username'}
        </button>
      </form>
    </>
  );
};

export default SetUsernamePage;
