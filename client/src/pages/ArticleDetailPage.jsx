import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, BookOpen, Download, Edit2, Trash2, Calendar, Folder, File, ExternalLink, ChevronRight, Lock } from 'lucide-react';
import LevelBadge, { getLevel } from '../components/LevelBadge';
import '../components/LevelBadge.css';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import ArticleFormModal from '../components/ArticleFormModal';
import './ArticleDetailPage.css';

const ArticleDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [article, setArticle] = useState(null);
  const [subject, setSubject] = useState(null);
  const [topic, setTopic] = useState(null);

  const [loading, setLoading] = useState(true);
  const [resolvingBreadcrumbs, setResolvingBreadcrumbs] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloading, setDownloading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);

  // Fetch article detail
  const fetchArticleDetail = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await client.get(`/knowledge/articles/${id}`);
      const art = res.data.data;
      setArticle(art);

      // Resolve breadcrumbs name mapping from database
      if (art && art.topic_id) {
        resolveBreadcrumbs(art.topic_id);
      }
    } catch (err) {
      console.error('Failed to get article detail:', err);
      if (err.response?.status === 404) {
        setErrorMsg(t('articleDetail.notFound'));
      } else if (err.response?.status === 403) {
        setErrorMsg(t('articleDetail.accessDenied'));
      } else {
        setErrorMsg(t('articleDetail.loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const resolveBreadcrumbs = async (topicId) => {
    setResolvingBreadcrumbs(true);
    try {
      // 1. Fetch all subjects
      const subjectsRes = await client.get('/knowledge/subjects');
      const subjectsList = subjectsRes.data.data || [];

      // 2. Find matching subject and topic
      for (const sub of subjectsList) {
        const topicsRes = await client.get(`/knowledge/subjects/${sub.id}/topics`);
        const topicsList = topicsRes.data.data || [];
        const matchedTopic = topicsList.find(t => t.id === topicId);

        if (matchedTopic) {
          setSubject(sub);
          setTopic(matchedTopic);
          break;
        }
      }
    } catch (err) {
      console.error('Failed to resolve breadcrumbs:', err);
    } finally {
      setResolvingBreadcrumbs(false);
    }
  };

  useEffect(() => {
    fetchArticleDetail();
  }, [id]);

  const handleDelete = async () => {
    if (!article) return;
    if (window.confirm(t('articleDetail.confirmDelete', { title: article.title }))) {
      try {
        await client.delete(`/knowledge/articles/${id}`);
        navigate('/knowledge', {
          state: {
            subjectId: subject?.id,
            topicId: topic?.id
          }
        });
      } catch (err) {
        console.error('Failed to delete article:', err);
        alert(t('articleDetail.deleteFail'));
      }
    }
  };

  const handleDownloadPdf = async () => {
    if (!article || !article.pdf_url) return;
    setDownloading(true);
    try {
      const response = await fetch(article.pdf_url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', article.pdf_name || `${article.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Direct PDF download failed, falling back to open in tab:', error);
      window.open(article.pdf_url, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const canModify = () => {
    if (!user || !article) return false;
    return user.role === 'admin' || article.author_id === user.id;
  };

  if (loading) {
    return <div className="empty-state">{t('common.loading')}</div>;
  }

  if (errorMsg || !article) {
    return (
      <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <span>{errorMsg || t('articleDetail.loadFail')}</span>
        <button className="btn-back-link" onClick={() => navigate('/knowledge')}>
          <ArrowLeft size={16} />
          <span>{t('articleDetail.backToDir')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="article-detail-container">

      {/* Breadcrumb Path Row */}
      <div className="article-breadcrumbs">
        <span className="breadcrumb-item link" onClick={() => navigate('/knowledge')}>
          {t('articleDetail.knowledgeBase')}
        </span>
        <ChevronRight size={14} className="breadcrumb-sep" />

        {subject ? (
          <>
            <span
              className="breadcrumb-item link"
              onClick={() => navigate('/knowledge', { state: { subjectId: subject.id } })}
            >
              {subject.name}
            </span>
            <ChevronRight size={14} className="breadcrumb-sep" />
          </>
        ) : resolvingBreadcrumbs ? (
          <span className="breadcrumb-item loading">{t('articleDetail.loadingBreadcrumbs')}</span>
        ) : null}

        {topic ? (
          <>
            <span
              className="breadcrumb-item link"
              onClick={() => navigate('/knowledge', { state: { subjectId: subject?.id, topicId: topic.id } })}
            >
              {topic.name}
            </span>
            <ChevronRight size={14} className="breadcrumb-sep" />
          </>
        ) : null}

        <span className="breadcrumb-item active">{article.title}</span>
      </div>

      {/* Main Container */}
      <div className="article-detail-card">

        {/* Header Title Row */}
        <div className="article-detail-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 className="article-detail-title">{article.title}</h2>
              {(article.min_level || 1) > 1 && <LevelBadge level={article.min_level} size="md" />}
            </div>
            <div className="article-detail-meta">
              <Calendar size={14} />
              <span>{t('articleDetail.createdOn')} {new Date(article.created_at.replace(' ', 'T') + 'Z').toLocaleDateString()}</span>
              {article.status === 'draft' && (
                <span className="article-status-badge status-draft" style={{ marginLeft: '8px' }}>
                  DRAFT
                </span>
              )}
            </div>
          </div>

          {/* Action Row */}
          {canModify() && (
            <div className="owner-buttons">
              <button
                className="btn-action-edit"
                onClick={() => setEditModalOpen(true)}
              >
                <Edit2 size={16} />
                <span>{t('articleDetail.editBtn')}</span>
              </button>
              <button
                className="btn-action-delete"
                onClick={handleDelete}
              >
                <Trash2 size={16} />
                <span>{t('articleDetail.deleteBtn')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Block */}
        <div className="article-content-block">
          {article.locked ? (
            <div className="level-lock-banner">
              <Lock size={18} />
              {article.lock_reason === 'LOGIN_REQUIRED' ? (
                <span>
                  Bạn cần <strong>đăng nhập</strong> để xem nội dung này.
                </span>
              ) : (
                <span>
                  Nội dung này yêu cầu <strong>Level {article.min_level}</strong> để xem.
                  Hãy đăng bài, bình luận và react để tích lũy điểm!
                </span>
              )}
            </div>
          ) : article.content ? (
            <div className="markdown-body">
              <ReactMarkdown className="md-rendered">{article.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="no-content-text">{t('articleDetail.noContent')}</p>
          )}
        </div>

        {/* PDF Attachment block */}
        {article.pdf_file_id && (
          <div className="article-attachment-section">
            <h4 className="section-title">{t('articleDetail.attachedDoc')}</h4>
            <div className="pdf-attachment-card">
              <div className="pdf-card-left">
                <div className="pdf-icon-box">
                  <File size={24} />
                </div>
                <div className="pdf-info-box">
                  <span className="pdf-name">{article.pdf_name || 'attached_document.pdf'}</span>
                  <span className="pdf-size">{t('articleDetail.pdfType')}</span>
                </div>
              </div>

              <div className="pdf-actions">
                {article.pdf_url && (
                  <>
                    <a
                      href={article.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-pdf-open"
                    >
                      <ExternalLink size={14} />
                      <span>{t('articleDetail.openPdf')}</span>
                    </a>
                    <button
                      className="btn-pdf-download"
                      onClick={handleDownloadPdf}
                      disabled={downloading}
                    >
                      <Download size={14} />
                      <span>{downloading ? t('articleDetail.downloading') : t('articleDetail.downloadBtn')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Edit Form Modal */}
      <ArticleFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={fetchArticleDetail}
        articleToEdit={article}
        activeSubjectId={subject?.id}
        activeTopicId={topic?.id}
      />

    </div>
  );
};

export default ArticleDetailPage;
