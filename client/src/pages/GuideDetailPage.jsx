import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, BookOpen, Download, Edit2, Trash2, Calendar, Folder, Lock, Unlock, LogIn, X } from 'lucide-react';
import LevelBadge, { getLevel } from '../components/LevelBadge';
import '../components/LevelBadge.css';
import ReactMarkdown from 'react-markdown';
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
        setErrorMsg(t('guideDetail.notFound'));
      } else {
        setErrorMsg(t('guideDetail.loadError'));
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
    if (window.confirm(t('guideDetail.confirmDelete', { title: guide.title }))) {
      try {
        await client.delete(`/guides/${id}`);
        navigate('/guides');
      } catch (err) {
        console.error('Failed to delete guide:', err);
        alert(t('guideDetail.deleteError'));
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
      } else if (errCode === 'LEVEL_REQUIRED') {
        alert(err.response?.data?.error?.message || 'Bạn chưa đủ level để tải xuống tài liệu này.');
      } else {
        console.error('Download preparation failed:', err);
        alert(err.response?.data?.error?.message || t('guideDetail.downloadError'));
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
        <span>{errorMsg || t('guideDetail.loadFail')}</span>
        <button className="btn-back-link" onClick={() => navigate('/guides')}>
          <ArrowLeft size={16} />
          <span>{t('guideDetail.backToLibrary')}</span>
        </button>
      </div>
    );
  }

  const isPro = guide.access_level === 'pro';
  const minLvl = guide.min_level != null ? guide.min_level : 1;
  const isTeacherOrAdmin = user && (user.role === 'teacher' || user.role === 'admin');
  const userLvl = user ? (user.role === 'student' ? getLevel(user.level_points || 0) : 99) : null;
  const isLevelLocked = !isTeacherOrAdmin && (
    (minLvl > 0 && userLvl === null) ||
    (minLvl >= 2 && userLvl !== null && userLvl < minLvl)
  );

  return (
    <div className="guide-detail-container">
      
      {/* Toast Notification for Guest Downloads */}
      {showToast && (
        <div className="login-toast">
          <div className="toast-content">
            <span className="toast-text">{t('guideDetail.toastSignIn')}</span>
            <div className="toast-actions">
              <button
                className="btn-toast-signin"
                onClick={() => navigate('/login', { state: { from: `/guides/${id}` } })}
              >
                <LogIn size={14} />
                <span>{t('guideDetail.signInBtn')}</span>
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
          <span>{t('guideDetail.backToLibrary')}</span>
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
                {guide.category || t('guideDetail.general')}
              </span>
              <span className={`guide-access-badge badge-${guide.access_level}`}>
                {isPro ? <Lock size={12} style={{ marginRight: '4px' }} /> : <Unlock size={12} style={{ marginRight: '4px' }} />}
                {guide.access_level.toUpperCase()}
              </span>
              {minLvl > 1 && <LevelBadge level={minLvl} size="sm" />}
            </div>
            <h2 className="guide-detail-title">{guide.title}</h2>
            
            <div className="guide-timestamp">
              <Calendar size={14} style={{ marginRight: '6px' }} />
              <span>{t('guideDetail.createdOn')} {new Date(guide.created_at.replace(' ', 'T') + 'Z').toLocaleDateString()}</span>
            </div>
          </div>

          {/* Action column */}
          <div className="guide-detail-actions">
            {canModify() && (
              <div className="owner-buttons">
                <button
                  className="btn-action-edit"
                  onClick={() => setEditModalOpen(true)}
                  title={t('guideDetail.editTitle')}
                >
                  <Edit2 size={16} />
                  <span>{t('guideDetail.editBtn')}</span>
                </button>
                <button
                  className="btn-action-delete"
                  onClick={handleDelete}
                  title={t('guideDetail.deleteTitle')}
                >
                  <Trash2 size={16} />
                  <span>{t('guideDetail.deleteBtn')}</span>
                </button>
              </div>
            )}
            
            {isLevelLocked ? (
              <div className="level-lock-banner" style={{ marginTop: 0 }}>
                <Lock size={18} />
                {minLvl === 1
                  ? <span>Bạn cần <strong>đăng nhập</strong> để tải xuống tài liệu này</span>
                  : <span>Yêu cầu <strong>Level {minLvl}</strong> để tải xuống</span>
                }
              </div>
            ) : (
              <button
                className={`btn-download-trigger ${isPro ? 'pro-trigger' : 'free-trigger'}`}
                onClick={handleDownload}
                disabled={downloading}
              >
                <Download size={18} />
                <span>{downloading ? t('guideDetail.downloading') : t('guideDetail.downloadBtn')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content details description */}
        <div className="guide-detail-body">
          <h4 className="body-section-title">{t('guideDetail.overview')}</h4>
          {guide.description ? (
            <ReactMarkdown className="body-text-content md-rendered">{guide.description}</ReactMarkdown>
          ) : (
            <p className="body-text-content">{t('guideDetail.noDescription')}</p>
          )}

          {/* Attached Document Card Info */}
          <div className="attached-document-card">
            <div className="card-doc-icon">
              <BookOpen size={24} />
            </div>
            <div className="card-doc-info">
              <span className="doc-label">{t('guideDetail.attachmentDoc')}</span>
              <span className="doc-type">{t('guideDetail.attachmentFormat')}</span>
            </div>
            <span className={`doc-license badge-${guide.access_level}`}>
              {t('guideDetail.accessLabel', { level: guide.access_level })}
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
