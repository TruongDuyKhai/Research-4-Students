import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import client from '../api/client';
import './ResourceFormModal.css';

const ReportModal = ({ isOpen, onClose, targetType, targetId, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Please provide a reason for this report.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await client.post('/community/reports', {
        target_type: targetType,
        target_id: parseInt(targetId, 10),
        reason: reason.trim()
      });
      
      setReason('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to submit report:', err);
      const msg = err.response?.data?.error?.message || 'An error occurred while submitting your report. Please try again.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-container" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-warning)' }}>
            <AlertTriangle size={20} />
            <h3 className="modal-title" style={{ margin: 0 }}>Report Content</h3>
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
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            You are reporting a <strong>{targetType}</strong> (ID: {targetId}). Please specify why this content violates guidelines (e.g. spam, harassment, incorrect information).
          </p>

          <div className="form-group">
            <label className="form-label">Reason for Report *</label>
            <textarea 
              className="form-input"
              rows={4}
              placeholder="Provide details about why you are reporting this content..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              disabled={submitting}
            />
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
              style={{ backgroundColor: 'var(--color-warning)' }}
              disabled={submitting || !reason.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
