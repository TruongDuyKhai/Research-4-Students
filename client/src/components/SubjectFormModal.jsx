import React, { useState } from 'react';
import { X } from 'lucide-react';
import { slugify } from '../utils/slugify';
import client from '../api/client';
import './ResourceFormModal.css'; // Reuse modal styles

const SubjectFormModal = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Subject name is required.');
      return;
    }

    const slug = slugify(trimmedName);
    setSubmitting(true);

    try {
      await client.post('/knowledge/subjects', { name: trimmedName, slug });
      setName('');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create subject:', err);
      const msg = err.response?.data?.error?.message || 'Failed to create subject. The slug may already exist.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title">New Subject</h3>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', fontWeight: '600' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Subject Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Phương pháp luận"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={submitting}
              autoFocus
            />
            {name && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Slug: <strong>{slugify(name)}</strong>
              </div>
            )}
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
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectFormModal;
