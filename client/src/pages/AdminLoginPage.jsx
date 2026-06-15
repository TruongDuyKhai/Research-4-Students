import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap } from 'lucide-react';
import client from '../api/client';

const AdminLoginPage = () => {
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
      const res = await client.post('/auth/admin/login', { email, password });
      const { token, user } = res.data.data;

      login(token, user);
      const adminRoute = import.meta.env.VITE_ADMIN_ROUTE || '/portal-mgmt-7f3a';
      navigate(adminRoute);
    } catch (err) {
      console.error('Admin login error:', err);
      const errMsg = err.response?.data?.error?.message || 'Invalid admin email or password. Please try again.';
      setErrorMsg(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="auth-header">
        <GraduationCap className="auth-logo" style={{ color: 'var(--color-danger)' }} />
        <h2 className="auth-title">Admin Console</h2>
        <p className="auth-subtitle">Sign in to manage Research 4 Student</p>
      </div>

      {errorMsg && (
        <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', textAlign: 'center', margin: '4px 0' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input 
            type="email" 
            className="form-input" 
            placeholder="admin@research4student.io.vn" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={submitting}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
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
          style={{ backgroundColor: 'var(--color-danger)', marginTop: '8px' }}
          disabled={submitting}
        >
          {submitting ? 'Authenticating...' : 'Admin Login'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <NavLink to="/login" className="back-link" style={{ color: 'var(--color-text-secondary)' }}>
          ← Back to Student Portal
        </NavLink>
      </div>
    </>
  );
};

export default AdminLoginPage;
