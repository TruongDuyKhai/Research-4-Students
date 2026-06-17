import React, { useState, useEffect } from 'react';
import { X, Upload, File } from 'lucide-react';
import client from '../api/client';
import MarkdownEditor from './MarkdownEditor';
import './ResourceFormModal.css';

const GuideFormModal = ({ isOpen, onClose, onSuccess, guideToEdit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [accessLevel, setAccessLevel] = useState('free');
  const [status, setStatus] = useState('published');
  
  // File upload state
  const [fileId, setFileId] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Initialize form state based on Edit vs Create mode
  useEffect(() => {
    if (guideToEdit) {
      setTitle(guideToEdit.title || '');
      setDescription(guideToEdit.description || '');
      setCategory(guideToEdit.category || '');
      setAccessLevel(guideToEdit.access_level || 'free');
      setStatus(guideToEdit.status || 'published');
      setFileId(guideToEdit.file_id || null);
      
      // In edit mode, if we have original filename information, display it.
      setFileName(guideToEdit.file_name || 'Current Attachment (PDF)');
      
      // If there is file details we can fetch them
      if (guideToEdit.file_id) {
        const fetchFileDetails = async () => {
          try {
            const res = await client.get(`/files/${guideToEdit.file_id}`);
            if (res.data?.data) {
              setFileName(res.data.data.original_name);
            }
          } catch (err) {
            console.error('Failed to fetch file details in modal:', err);
          }
        };
        fetchFileDetails();
      }
    } else {
      setTitle('');
      setDescription('');
      setCategory('');
      setAccessLevel('free');
      setStatus('published');
      setFileId(null);
      setFileName(null);
    }
    setErrorMsg('');
  }, [guideToEdit, isOpen]);

  if (!isOpen) return null;

  // Handle PDF file upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErrorMsg('Please select a valid PDF file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'guide_doc');

    setUploading(true);
    setErrorMsg('');

    try {
      const res = await client.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFileId(res.data.data.id);
      setFileName(file.name);
    } catch (err) {
      console.error('Failed to upload file:', err);
      const msg = err.response?.data?.error?.message || 'Failed to upload PDF. Max size is 10MB.';
      setErrorMsg(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fileId) {
      setErrorMsg('A PDF file attachment is required.');
      return;
    }

    setSubmitting(true);
    const payload = {
      title,
      description,
      category: category.trim() || 'General',
      access_level: accessLevel,
      file_id: fileId,
      status
    };

    try {
      if (guideToEdit) {
        // Edit mode (PATCH /api/guides/:id)
        await client.patch(`/guides/${guideToEdit.id}`, payload);
      } else {
        // Create mode (POST /api/guides)
        await client.post('/guides', payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save guide:', err);
      const msg = err.response?.data?.error?.message || 'An error occurred while saving the guide.';
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
            {guideToEdit ? 'Edit Guide' : 'New Guide'}
          </h3>
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
            <label className="form-label">Guide Title *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Hướng dẫn viết Đề cương Nghiên cứu khoa học"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Phương pháp luận, Đề cương"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Access Level *</label>
              <select 
                className="form-input"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status *</label>
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

          {/* PDF Attachment Selector */}
          <div className="form-group">
            <label className="form-label">Attached PDF Document *</label>
            <div className="icon-upload-section">
              <div className="icon-preview-box">
                <File size={24} style={{ color: fileId ? 'var(--color-danger)' : 'var(--color-text-secondary)' }} />
              </div>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {fileName ? (
                  <span style={{ fontSize: '0.825rem', fontWeight: '600', wordBreak: 'break-all' }}>{fileName}</span>
                ) : (
                  <span style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)' }}>No file attached</span>
                )}
              </div>
              <div className="icon-upload-btn-wrapper">
                <button type="button" className="btn-upload-file">
                  <Upload size={14} style={{ marginRight: '6px' }} />
                  {uploading ? 'Uploading...' : 'Choose PDF'}
                </button>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  className="file-input-hidden" 
                  onChange={handleFileChange}
                  disabled={uploading || submitting}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Outlines</label>
            <MarkdownEditor
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description or outline of what is covered in this guide..."
              rows={4}
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
              disabled={submitting || uploading}
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default GuideFormModal;
