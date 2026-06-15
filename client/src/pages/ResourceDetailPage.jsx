import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Globe, ArrowLeft, Edit2, Trash2, ExternalLink } from 'lucide-react';
import client from '../api/client';
import ResourceFormModal from '../components/ResourceFormModal';
import './ResourcesPage.css';

const ResourceDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch resource detail on load
  const fetchResourceDetail = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await client.get(`/resources/${id}`);
      setResource(res.data.data);
    } catch (err) {
      console.error('Failed to get resource detail:', err);
      if (err.response?.status === 404) {
        setErrorMsg('Research website not found.');
      } else {
        setErrorMsg('An error occurred while loading details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResourceDetail();
  }, [id]);

  const handleDelete = async () => {
    if (!resource) return;
    if (window.confirm(`Are you sure you want to delete "${resource.name}"?`)) {
      try {
        await client.delete(`/resources/${id}`);
        navigate('/resources');
      } catch (err) {
        console.error('Failed to delete resource:', err);
        alert('Failed to delete research website. Please try again.');
      }
    }
  };

  // Check if current user is owner or admin
  const canModify = () => {
    if (!user || !resource) return false;
    return user.role === 'admin' || resource.created_by === user.id;
  };

  if (loading) {
    return <div className="empty-state">{t('common.loading')}</div>;
  }

  if (errorMsg || !resource) {
    return (
      <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <span>{errorMsg || 'Failed to load details.'}</span>
        <button className="btn-detail-edit" onClick={() => navigate('/resources')}>
          <ArrowLeft size={16} />
          <span>Back to List</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Back button */}
      <div>
        <button 
          className="btn-detail-edit" 
          onClick={() => navigate('/resources')}
          style={{ width: 'fit-content' }}
        >
          <ArrowLeft size={16} />
          <span>Back to List</span>
        </button>
      </div>

      {/* Main Detail Container */}
      <div className="detail-container">
        
        {/* Header */}
        <div className="detail-header">
          <div className="detail-header-left">
            {resource.icon_url ? (
              <img src={resource.icon_url} alt={resource.name} className="detail-icon-large" />
            ) : (
              <div className="detail-icon-large" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                <Globe size={36} style={{ color: 'var(--color-text-secondary)', alignSelf: 'center' }} />
              </div>
            )}
            <div className="detail-meta">
              <h2 className="detail-name">{resource.name}</h2>
              <div className="detail-badge-row">
                <span className={`resource-badge badge-${resource.access_type}`}>
                  {resource.access_type}
                </span>
                <span style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)' }}>
                  ID: {resource.id}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="detail-header-actions">
            {canModify() && (
              <>
                <button 
                  className="btn-detail-edit"
                  onClick={() => setModalOpen(true)}
                >
                  <Edit2 size={16} />
                  <span>Edit</span>
                </button>
                <button 
                  className="btn-detail-delete"
                  onClick={handleDelete}
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </>
            )}
            
            <a 
              href={resource.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-primary"
            >
              <span>Visit Website</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>

        {/* Content Description */}
        <div className="detail-content">
          <div className="detail-desc-block">
            <h4 className="detail-desc-title">About this resource</h4>
            <p className="detail-desc-text">{resource.full_description}</p>
          </div>

          {/* Dynamic Chip Blocks */}
          <div className="detail-info-block">
            
            {/* Target Audience */}
            <div className="info-column">
              <h4 className="info-title">Target Audience</h4>
              {resource.target_audience && resource.target_audience.length > 0 ? (
                <div className="info-chips">
                  {resource.target_audience.map((tag) => (
                    <span key={tag} className="info-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  No target audience tags defined.
                </span>
              )}
            </div>

            {/* Key Features */}
            <div className="info-column">
              <h4 className="info-title">Key Features</h4>
              {resource.features && resource.features.length > 0 ? (
                <ul className="info-list">
                  {resource.features.map((feature) => (
                    <li key={feature} className="info-list-item">
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : (
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', paddingLeft: '20px' }}>
                  No key features listed.
                </span>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Form Modal */}
      <ResourceFormModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchResourceDetail}
        resourceToEdit={resource}
      />

    </div>
  );
};

export default ResourceDetailPage;
