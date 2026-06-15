import React, { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import client from '../api/client';
import Turnstile from './Turnstile';
import './ResourceFormModal.css';

const ProjectFormModal = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('recruiting');
  const [visibility, setVisibility] = useState('public');
  const [turnstileToken, setTurnstileToken] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Clear state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setStatus('recruiting');
      setVisibility('public');
      setTurnstileToken(null);
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Project Name is required.');
      return;
    }

    if (!turnstileToken) {
      setErrorMsg('Please complete the Turnstile security check.');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      status,
      visibility,
      turnstileToken
    };

    try {
      await client.post('/community/projects', payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
      const errCode = err.response?.data?.error?.code;
      let msg = err.response?.data?.error?.message || 'An error occurred while creating project.';
      
      if (errCode === 'COOLDOWN') {
        const retrySec = err.response?.data?.error?.retryAfterSeconds || 120;
        msg = `You are doing this too fast. Please wait ${retrySec} seconds before creating another project.`;
      }
      setErrorMsg(msg);
      
      // Reset Turnstile token on failure to force re-verification
      setTurnstileToken(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-container" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
            <Users size={20} />
            <h3 className="modal-title" style={{ margin: 0 }}>Create New Group Project</h3>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '12px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Nghiên cứu AI Agent cho giáo dục"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Initial Status</label>
              <select 
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={submitting}
              >
                <option value="recruiting">Recruiting members</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Visibility</label>
              <select 
                className="form-input"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                disabled={submitting}
              >
                <option value="public">Public (Everyone can see feed)</option>
                <option value="private">Private (Only members can see feed)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Project Description</label>
            <textarea 
              className="form-input"
              rows={4}
              placeholder="Describe the research goals, scopes, and target members..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Cloudflare Turnstile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Security Verification *</label>
            <Turnstile onVerify={(token) => setTurnstileToken(token)} />
          </div>

          <div className="modal-actions-row">
            <button 
              type="button" 
              className="btn-modal-cancel" 
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-modal-submit"
              disabled={submitting || !turnstileToken}
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ProjectFormModal;
