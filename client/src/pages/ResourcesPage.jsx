import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Edit2, Trash2, Globe } from 'lucide-react';
import client from '../api/client';
import ResourceFormModal from '../components/ResourceFormModal';
import './ResourcesPage.css';

const ResourcesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [total, setTotal] = useState(0);

  // Filter states
  const [accessType, setAccessType] = useState(''); // '', 'free', 'paid'
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  const searchDebounceRef = useRef(null);

  // Fetch directory list from API
  const fetchResources = async (activePage = page, activeAccess = accessType, activeSearch = search) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      params.append('page', activePage);
      params.append('limit', limit);
      if (activeAccess) {
        params.append('access_type', activeAccess);
      }
      if (activeSearch) {
        params.append('search', activeSearch);
      }

      const res = await client.get(`/resources?${params.toString()}`);
      setResources(res.data.data || []);
      
      const pag = res.data.pagination;
      if (pag) {
        setTotal(pag.total || 0);
      }
    } catch (err) {
      console.error('Failed to get resources:', err);
      setErrorMsg(t('resources.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when access type or page changes
  useEffect(() => {
    fetchResources(page, accessType, search);
  }, [page, accessType]);

  // Debounced search trigger
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(1); // Reset page to 1 on search change

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      fetchResources(1, accessType, value);
    }, 400);
  };

  // Tab filter trigger
  const handleTabChange = (type) => {
    setAccessType(type);
    setPage(1); // Reset page to 1
  };

  // Open modal for editing
  const handleEditClick = async (e, resId) => {
    e.stopPropagation();
    try {
      // Get the full detail resource first (to get full_description, tags, etc.)
      const res = await client.get(`/resources/${resId}`);
      setEditingResource(res.data.data);
      setModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch resource detail for editing:', err);
    }
  };

  // Delete resource
  const handleDeleteClick = async (e, resId, resName) => {
    e.stopPropagation();
    if (window.confirm(t('resources.confirmDelete', { name: resName }))) {
      try {
        await client.delete(`/resources/${resId}`);
        fetchResources(page, accessType, search);
      } catch (err) {
        console.error('Failed to delete resource:', err);
      }
    }
  };

  // Check if current user has edit permission on list page
  const canModify = (res) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'teacher' && res && res.created_by === user.id) return true;
    return false;
  };

  const isTeacherOrAdmin = user && (user.role === 'teacher' || user.role === 'admin');

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* Title Header Section */}
      <div className="resources-header-row">
        <h2 className="resources-title">{t('nav.resources')}</h2>
        {isTeacherOrAdmin && (
          <button
            className="btn-new-resource"
            onClick={() => {
              setEditingResource(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>{t('resources.newBtn')}</span>
          </button>
        )}
      </div>

      {/* Filter and Search Section */}
      <div className="filter-section">
        <div className="tabs-group">
          <button
            className={`tab-btn ${accessType === '' ? 'active' : ''}`}
            onClick={() => handleTabChange('')}
          >
            {t('resources.tabAll')}
          </button>
          <button
            className={`tab-btn ${accessType === 'free' ? 'active' : ''}`}
            onClick={() => handleTabChange('free')}
          >
            {t('resources.tabFree')}
          </button>
          <button
            className={`tab-btn ${accessType === 'paid' ? 'active' : ''}`}
            onClick={() => handleTabChange('paid')}
          >
            {t('resources.tabPaid')}
          </button>
        </div>

        <div className="search-wrapper">
          <Search className="search-icon-inside" />
          <input 
            type="text" 
            className="search-input" 
            placeholder={t('common.search')}
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Grid List */}
      {errorMsg && (
        <div style={{ color: 'var(--color-danger)', padding: '16px', fontWeight: 'bold' }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="empty-state">{t('common.loading')}</div>
      ) : resources.length === 0 ? (
        /* Empty State */
        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Globe size={48} style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }} />
          <span>{t('resources.emptyState')}</span>
          {isTeacherOrAdmin && (
            <button
              className="btn-new-resource"
              onClick={() => {
                setEditingResource(null);
                setModalOpen(true);
              }}
              style={{ marginTop: '8px' }}
            >
              <Plus size={16} />
              <span>{t('resources.addFirst')}</span>
            </button>
          )}
        </div>
      ) : (
        /* Cards Directory Grid */
        <>
          <div className="directory-grid">
            {resources.map((res) => (
              <div 
                key={res.id} 
                className="resource-card directory-card"
                onClick={() => navigate(`/resources/${res.id}`)}
                style={{ cursor: 'pointer' }}
              >
                {/* Admin/Teacher edit/delete buttons overlay */}
                {canModify(res) && (
                  <div className="card-actions-overlay">
                    <button
                      className="btn-card-action"
                      onClick={(e) => handleEditClick(e, res.id)}
                      title={t('resources.detail.edit')}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="btn-card-action delete"
                      onClick={(e) => handleDeleteClick(e, res.id, res.name)}
                      title={t('resources.detail.delete')}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}

                <div className="resource-card-header">
                  <div className="resource-meta">
                    <span className="resource-name">{res.name}</span>
                    <span className={`resource-badge badge-${res.access_type}`}>
                      {res.access_type}
                    </span>
                  </div>
                  {res.icon_url ? (
                    <img src={res.icon_url} alt={res.name} className="resource-icon" />
                  ) : (
                    <div className="resource-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Globe size={18} style={{ color: 'var(--color-text-secondary)' }} />
                    </div>
                  )}
                </div>
                
                <p className="resource-desc">{res.short_description}</p>
                <button
                  className="btn-visit"
                  onClick={() => navigate(`/resources/${res.id}`)}
                >
                  {t('resources.visitBtn')}
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="pagination-row">
              <button
                className="btn-page"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                &larr; {t('resources.prevPage')}
              </button>
              <span className="page-indicator">
                {t('resources.pageInfo', { page, total: Math.ceil(total / limit) })}
              </span>
              <button
                className="btn-page"
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / limit)}
              >
                {t('resources.nextPage')} &rarr;
              </button>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      <ResourceFormModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchResources(page, accessType, search)}
        resourceToEdit={editingResource}
      />

    </div>
  );
};

export default ResourcesPage;
