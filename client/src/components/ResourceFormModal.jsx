import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Globe, Tag } from 'lucide-react';
import client from '../api/client';
import MarkdownEditor from './MarkdownEditor';
import './ResourceFormModal.css';

const ResourceFormModal = ({ isOpen, onClose, onSuccess, resourceToEdit }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  const [accessType, setAccessType] = useState('free');
  
  // Icon file upload state
  const [iconFileId, setIconFileId] = useState(null);
  const [iconUrl, setIconUrl] = useState(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  // Tag inputs state
  const [targetAudience, setTargetAudience] = useState([]);
  const [audienceInput, setAudienceInput] = useState('');
  
  const [features, setFeatures] = useState([]);
  const [featuresInput, setFeaturesInput] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Populate form if in edit mode
  useEffect(() => {
    if (resourceToEdit) {
      setName(resourceToEdit.name || '');
      setUrl(resourceToEdit.url || '');
      setShortDesc(resourceToEdit.short_description || '');
      setFullDesc(resourceToEdit.full_description || '');
      setAccessType(resourceToEdit.access_type || 'free');
      setIconFileId(resourceToEdit.icon_file_id || null);
      setIconUrl(resourceToEdit.icon_url || null);
      setTargetAudience(resourceToEdit.target_audience || []);
      setFeatures(resourceToEdit.features || []);
    } else {
      // Clear form for create mode
      setName('');
      setUrl('');
      setShortDesc('');
      setFullDesc('');
      setAccessType('free');
      setIconFileId(null);
      setIconUrl(null);
      setTargetAudience([]);
      setFeatures([]);
    }
    setErrorMsg('');
  }, [resourceToEdit, isOpen]);

  if (!isOpen) return null;

  // Handle icon file selection and instant upload
  const handleIconChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'resource_icon');

    setUploadingIcon(true);
    setErrorMsg('');

    try {
      const res = await client.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIconFileId(res.data.data.id);
      setIconUrl(res.data.data.cdn_url);
    } catch (err) {
      console.error('File upload failed:', err);
      setErrorMsg(t('resources.form.errorUpload'));
    } finally {
      setUploadingIcon(false);
    }
  };

  // Target Audience tag operations
  const handleAddAudience = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = audienceInput.trim();
      if (val && !targetAudience.includes(val)) {
        setTargetAudience([...targetAudience, val]);
      }
      setAudienceInput('');
    }
  };

  const handleRemoveAudience = (tagToRemove) => {
    setTargetAudience(targetAudience.filter(t => t !== tagToRemove));
  };

  // Key Features tag operations
  const handleAddFeature = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = featuresInput.trim();
      if (val && !features.includes(val)) {
        setFeatures([...features, val]);
      }
      setFeaturesInput('');
    }
  };

  const handleRemoveFeature = (featureToRemove) => {
    setFeatures(features.filter(f => f !== featureToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // URL validation
    if (!url.toLowerCase().startsWith('http://') && !url.toLowerCase().startsWith('https://')) {
      setErrorMsg(t('resources.form.errorUrl'));
      return;
    }

    if (shortDesc.length > 150) {
      setErrorMsg(t('resources.form.errorShortDesc'));
      return;
    }

    setSubmitting(true);
    const payload = {
      name,
      url,
      short_description: shortDesc,
      full_description: fullDesc,
      access_type: accessType,
      icon_file_id: iconFileId,
      target_audience: targetAudience,
      features
    };

    try {
      if (resourceToEdit) {
        // Edit Mode (PATCH /api/resources/:id)
        await client.patch(`/resources/${resourceToEdit.id}`, payload);
      } else {
        // Create Mode (POST /api/resources)
        await client.post('/resources', payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Resource form error:', err);
      const msg = err.response?.data?.error?.message || t('resources.form.errorSave');
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">
            {resourceToEdit ? t('resources.form.titleEdit') : t('resources.form.titleNew')}
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Form Row: Name & Access Type */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('resources.form.nameLabel')}</label>
              <input
                type="text"
                className="form-input"
                placeholder="Google Scholar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('resources.form.accessTypeLabel')}</label>
              <select
                className="form-input"
                value={accessType}
                onChange={(e) => setAccessType(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="free">{t('resources.form.accessFree')}</option>
                <option value="paid">{t('resources.form.accessPaid')}</option>
              </select>
            </div>
          </div>

          {/* URL */}
          <div className="form-group">
            <label className="form-label">{t('resources.form.urlLabel')}</label>
            <input
              type="text"
              className="form-input"
              placeholder="https://scholar.google.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          {/* Icon Upload section */}
          <div className="form-group">
            <label className="form-label">{t('resources.form.iconLabel')}</label>
            <div className="icon-upload-section">
              <div className="icon-preview-box">
                {iconUrl ? (
                  <img src={iconUrl} alt="Icon Preview" className="icon-preview-img" />
                ) : (
                  <Globe size={24} style={{ color: 'var(--color-text-secondary)' }} />
                )}
              </div>
              <div className="icon-upload-btn-wrapper">
                <button type="button" className="btn-upload-file">
                  <Upload size={14} style={{ marginRight: '6px' }} />
                  {uploadingIcon ? t('resources.form.uploadingIcon') : t('resources.form.uploadIcon')}
                </button>
                <input
                  type="file"
                  accept="image/*"
                  className="file-input-hidden"
                  onChange={handleIconChange}
                  disabled={uploadingIcon || submitting}
                />
              </div>
            </div>
          </div>

          {/* Short Description */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">{t('resources.form.shortDescLabel')}</label>
              <span className="form-group-text">{shortDesc.length}/150</span>
            </div>
            <textarea
              className="form-input"
              rows={2}
              maxLength={150}
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              required
              disabled={submitting}
              style={{ resize: 'none' }}
            />
          </div>

          {/* Full Description */}
          <div className="form-group">
            <label className="form-label">{t('resources.form.fullDescLabel')}</label>
            <MarkdownEditor
              value={fullDesc}
              onChange={(e) => setFullDesc(e.target.value)}
              placeholder="Mô tả chi tiết về website nghiên cứu này..."
              rows={4}
              disabled={submitting}
            />
          </div>

          {/* Target Audience (Tag Input) */}
          <div className="tag-input-container">
            <label className="form-label">{t('resources.form.audienceLabel')}</label>
            <div className="tags-input-wrapper">
              {targetAudience.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button
                    type="button"
                    className="btn-remove-tag"
                    onClick={() => handleRemoveAudience(tag)}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                className="tags-inline-input"
                placeholder="e.g. IT Students"
                value={audienceInput}
                onChange={(e) => setAudienceInput(e.target.value)}
                onKeyDown={handleAddAudience}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Key Features (Tag Input) */}
          <div className="tag-input-container">
            <label className="form-label">{t('resources.form.featuresLabel')}</label>
            <div className="tags-input-wrapper">
              {features.map((feature) => (
                <span key={feature} className="tag-chip">
                  {feature}
                  <button
                    type="button"
                    className="btn-remove-tag"
                    onClick={() => handleRemoveFeature(feature)}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                className="tags-inline-input"
                placeholder="e.g. Citation Export"
                value={featuresInput}
                onChange={(e) => setFeaturesInput(e.target.value)}
                onKeyDown={handleAddFeature}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="modal-actions-row">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              {t('resources.form.cancel')}
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              disabled={submitting || uploadingIcon}
            >
              {submitting ? t('resources.form.saving') : t('resources.form.save')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ResourceFormModal;
