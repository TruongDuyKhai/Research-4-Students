import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, BookOpen, Download, Edit2, Trash2, Calendar, Folder, Lock, Unlock, LogIn, X } from 'lucide-react';
import client from '../api/client';
import GuideFormModal from '../components/GuideFormModal';
import ProDemoModal from '../components/ProDemoModal';
import './GuideDetailPage.css';

const GuideDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);

  // Toast state for unauthorized download
  const [showToast, setShowToast] = useState(false);

  // Fetch guide details on mount
  const fetchGuideDetail = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await client.get(`/guides/${id}`);
      setGuide(res.data.data);
    } catch (err) {
      console.error('Failed to get guide detail:', err);
      if (err.response?.status === 404) {
        setErrorMsg('Guide not found.');
      } else {
        setErrorMsg('An error occurred while loading the guide details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuideDetail();
  }, [id]);

  const handleDelete = async () => {
    if (!guide) return;
    if (window.confirm(`Are you sure you want to delete the guide "${guide.title}"?`)) {
      try {
        await client.delete(`/guides/${id}`);
        navigate('/guides');
      } catch (err) {
        console.error('Failed to delete guide:', err);
        alert('Failed to delete guide. Please try again.');
      }
    }
  };

  const handleDownload = async () => {
    if (!guide) return;

    // 1. If not logged in, show the toast overlay
    if (!user) {
      setShowToast(true);
      // Auto-hide toast after 8 seconds
      setTimeout(() => setShowToast(false), 8000);
      return;
    }

    // 2. If logged in, call download endpoint
    setDownloading(true);
    try {
      const res = await client.get(`/guides/${id}/download`);
      const { cdn_url } = res.data.data;
      
      // Open cdn_url in new tab
      window.open(cdn_url, '_blank');
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      if (errCode === 'PRO_FEATURE_DEMO') {
        setProModalOpen(true);
      } else {
        console.error('Download preparation failed:', err);
        alert(err.response?.data?.error?.message || 'Failed to download guide.');
      }
    } finally {
      setDownloading(false);
    }
  };

  const canModify = () => {
    if (!user || !guide) return false;
    return user.role === 'admin' || guide.created_by === user.id;
  };

  if (loading) {
    return <div className="empty-state">{t('common.loading')}</div>;
  }

  if (errorMsg || !guide) {
    return (
      <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <span>{errorMsg || 'Failed to load guide.'}</span>
        <button className="btn-back-link" onClick={() => navigate('/guides')}>
          <ArrowLeft size={16} />
          <span>Back to Library</span>
        </button>
      </div>
    );
  }

  const isPro = guide.access_level === 'pro';

  return (
    <div className="guide-detail-container">
      
      {/* Toast Notification for Guest Downloads */}
      {showToast && (
        <div className="login-toast">
          <div className="toast-content">
            <span className="toast-text">Please sign in to download this outline.</span>
            <div className="toast-actions">
              <button 
                className="btn-toast-signin" 
                onClick={() => navigate('/login', { state: { from: `/guides/${id}` } })}
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
              <button className="btn-toast-close" onClick={() => setShowToast(false)}>
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back navigation */}
      <div>
        <button 
          className="btn-back-link" 
          onClick={() => navigate('/guides')}
        >
          <ArrowLeft size={16} />
          <span>Back to Library</span>
        </button>
      </div>

      {/* Main Guide Detail card */}
      <div className="guide-detail-card">
        
        {/* Header Title Block */}
        <div className="guide-detail-header">
          <div className="guide-detail-title-col">
            <div className="guide-meta-labels">
              <span className="guide-category-chip">
                <Folder size={12} style={{ marginRight: '4px' }} />
                {guide.category || 'General'}
              </span>
              <span className={`guide-access-badge badge-${guide.access_level}`}>
                {isPro ? <Lock size={12} style={{ marginRight: '4px' }} /> : <Unlock size={12} style={{ marginRight: '4px' }} />}
                {guide.access_level.toUpperCase()}
              </span>
            </div>
            <h2 className="guide-detail-title">{guide.title}</h2>
            
            <div className="guide-timestamp">
              <Calendar size={14} style={{ marginRight: '6px' }} />
              <span>Created on {new Date(guide.created_at.replace(' ', 'T') + 'Z').toLocaleDateString()}</span>
            </div>
          </div>

          {/* Action column */}
          <div className="guide-detail-actions">
            {canModify() && (
              <div className="owner-buttons">
                <button 
                  className="btn-action-edit"
                  onClick={() => setEditModalOpen(true)}
                  title="Edit Guide"
                >
                  <Edit2 size={16} />
                  <span>Edit</span>
                </button>
                <button 
                  className="btn-action-delete"
                  onClick={handleDelete}
                  title="Delete Guide"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            )}
            
            <button 
              className={`btn-download-trigger ${isPro ? 'pro-trigger' : 'free-trigger'}`}
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download size={18} />
              <span>{downloading ? 'Downloading...' : 'Download Outline'}</span>
            </button>
          </div>
        </div>

        {/* Content details description */}
        <div className="guide-detail-body">
          <h4 className="body-section-title">Overview & Outlines</h4>
          <p className="body-text-content">
            {guide.description || 'No detailed outlines or description descriptions provided for this resource.'}
          </p>

          {/* Attached Document Card Info */}
          <div className="attached-document-card">
            <div className="card-doc-icon">
              <BookOpen size={24} />
            </div>
            <div className="card-doc-info">
              <span className="doc-label">Attachment Document</span>
              <span className="doc-type">Format: PDF Document (Requires active reader)</span>
            </div>
            <span className={`doc-license badge-${guide.access_level}`}>
              {guide.access_level} access
            </span>
          </div>
        </div>

      </div>

      {/* Edit Form Modal */}
      <GuideFormModal 
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={fetchGuideDetail}
        guideToEdit={guide}
      />

      {/* Pro Demo Alert Modal */}
      <ProDemoModal 
        isOpen={proModalOpen}
        onClose={() => setProModalOpen(false)}
      />

    </div>
  );
};

export default GuideDetailPage;
