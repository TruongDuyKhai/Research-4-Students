import React from 'react';
import { Lock, X } from 'lucide-react';
import './ResourceFormModal.css';

const ProDemoModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-container" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-16px', marginRight: '-8px' }}>
          <button className="btn-modal-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--badge-pro-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--badge-pro-text)'
          }}>
            <Lock size={28} />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
            Pro Feature Demo
          </h3>

          <p style={{
            fontSize: '0.925rem',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.5',
            margin: '0 0 8px 0',
            textAlign: 'center'
          }}>
            🔒 This is a Pro feature. Subscriptions are not available yet — this is a demo.
          </p>

          <button
            onClick={onClose}
            className="btn-modal-submit"
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProDemoModal;
