import React, { useState, useEffect } from 'react';
import { X, Upload, File } from 'lucide-react';
import client from '../api/client';
import MarkdownEditor from './MarkdownEditor';
import './ResourceFormModal.css';

const ArticleFormModal = ({ isOpen, onClose, onSuccess, articleToEdit, activeSubjectId, activeTopicId }) => {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('published');
  const [minLevel, setMinLevel] = useState(1);
  
  // PDF upload state
  const [pdfFileId, setPdfFileId] = useState(null);
  const [pdfFileName, setPdfFileName] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch all subjects on mount when modal opens
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await client.get('/knowledge/subjects');
        setSubjects(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch subjects in modal:', err);
      }
    };

    if (isOpen) {
      fetchSubjects();
    }
  }, [isOpen]);

  // 2. Fetch topics when selectedSubjectId changes
  useEffect(() => {
    const fetchTopicsForSubject = async () => {
      if (!selectedSubjectId) {
        setTopics([]);
        return;
      }
      try {
        const res = await client.get(`/knowledge/subjects/${selectedSubjectId}/topics`);
        setTopics(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch topics for subject in modal:', err);
      }
    };

    fetchTopicsForSubject();
  }, [selectedSubjectId]);

  // 3. Initialize form state based on Edit vs Create mode
  useEffect(() => {
    if (articleToEdit) {
      setTitle(articleToEdit.title || '');
      setContent(articleToEdit.content || '');
      setStatus(articleToEdit.status || 'published');
      setMinLevel(articleToEdit.min_level || 1);
      setPdfFileId(articleToEdit.pdf_file_id || null);
      setPdfFileName(articleToEdit.pdf_name || null);
      
      // Determine subject ID based on the active topic in edit mode if not directly provided
      setSelectedTopicId(articleToEdit.topic_id || '');
      if (activeSubjectId) {
        setSelectedSubjectId(activeSubjectId);
      }
    } else {
      // Create mode
      setTitle('');
      setContent('');
      setStatus('published');
      setMinLevel(1);
      setPdfFileId(null);
      setPdfFileName(null);
      
      // Populate defaults if we have active presets from the parent page
      if (activeSubjectId) {
        setSelectedSubjectId(activeSubjectId);
      } else {
        setSelectedSubjectId('');
      }
      
      if (activeTopicId) {
        setSelectedTopicId(activeTopicId);
      } else {
        setSelectedTopicId('');
      }
    }
    setErrorMsg('');
  }, [articleToEdit, isOpen, activeSubjectId, activeTopicId]);

  if (!isOpen) return null;

  // Handle PDF file selection and upload
  const handlePdfChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErrorMsg('Please select a valid PDF file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'article_pdf');

    setUploadingPdf(true);
    setErrorMsg('');

    try {
      const res = await client.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPdfFileId(res.data.data.id);
      setPdfFileName(file.name);
    } catch (err) {
      console.error('Failed to upload PDF:', err);
      setErrorMsg('Failed to upload PDF. Max size is 10MB.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedTopicId) {
      setErrorMsg('Topic selection is required.');
      return;
    }

    setSubmitting(true);
    const payload = {
      topic_id: parseInt(selectedTopicId, 10),
      title,
      content,
      pdf_file_id: pdfFileId,
      status,
      min_level: parseInt(minLevel, 10)
    };

    try {
      if (articleToEdit) {
        // Edit mode (PATCH /api/knowledge/articles/:id)
        await client.patch(`/knowledge/articles/${articleToEdit.id}`, payload);
      } else {
        // Create mode (POST /api/knowledge/articles)
        await client.post('/knowledge/articles', payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save article:', err);
      const msg = err.response?.data?.error?.message || 'An error occurred while saving the article.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3 className="modal-title">
            {articleToEdit ? 'Edit Article' : 'New Article'}
          </h3>
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
          
          {/* Form Row: Subject & Topic Dropdowns */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select 
                className="form-input"
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedTopicId('');
                }}
                required
                disabled={submitting}
              >
                <option value="">-- Select Subject --</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Topic *</label>
              <select 
                className="form-input"
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                required
                disabled={submitting || !selectedSubjectId}
              >
                <option value="">-- Select Topic --</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Title & Status */}
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Article Title *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Cách viết tổng quan văn liệu khoa học"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Publication Status *</label>
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Yêu cầu Level tối thiểu</label>
              <select
                className="form-input"
                value={minLevel}
                onChange={(e) => setMinLevel(e.target.value)}
                disabled={submitting}
              >
                <option value={0}>Level 0 (Công khai)</option>
                <option value={1}>Level 1 (Cần đăng nhập)</option>
                <option value={2}>Level 2 (≥ 50đ)</option>
                <option value={3}>Level 3 (≥ 200đ)</option>
                <option value={4}>Level 4 (≥ 500đ)</option>
                <option value={5}>Level 5 (≥ 1000đ)</option>
              </select>
            </div>
          </div>

          {/* PDF Attachment Selector */}
          <div className="form-group">
            <label className="form-label">Attached PDF Document (Optional)</label>
            <div className="icon-upload-section">
              <div className="icon-preview-box">
                <File size={24} style={{ color: pdfFileId ? 'var(--color-danger)' : 'var(--color-text-secondary)' }} />
              </div>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {pdfFileName ? (
                  <span style={{ fontSize: '0.825rem', fontWeight: '600', wordBreak: 'break-all' }}>{pdfFileName}</span>
                ) : (
                  <span style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)' }}>No file attached</span>
                )}
              </div>
              <div className="icon-upload-btn-wrapper">
                <button type="button" className="btn-upload-file">
                  <Upload size={14} style={{ marginRight: '6px' }} />
                  {uploadingPdf ? 'Uploading...' : 'Choose PDF'}
                </button>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  className="file-input-hidden" 
                  onChange={handlePdfChange}
                  disabled={uploadingPdf || submitting}
                />
              </div>
            </div>
          </div>

          {/* Content Markdown Textarea */}
          <div className="form-group">
            <label className="form-label">Article Content (Markdown Supported)</label>
            <MarkdownEditor
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="## Giới thiệu&#10;Viết nội dung bài viết tại đây..."
              rows={8}
              disabled={submitting}
            />
          </div>

          {/* Actions */}
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
              disabled={submitting || uploadingPdf}
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ArticleFormModal;
