import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Plus, BookOpen, FileText, ChevronRight, Lock, Unlock } from 'lucide-react';
import LevelBadge, { getLevel } from '../components/LevelBadge';
import '../components/LevelBadge.css';
import client from '../api/client';
import GuideFormModal from '../components/GuideFormModal';
import './GuidesPage.css';

const GuidesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [guides, setGuides] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'free', 'pro'
  
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);

  // 1. Fetch categories dynamically on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await client.get('/guides?limit=100');
        const allGuides = res.data.data || [];
        const distinctCats = [...new Set(allGuides.map(g => g.category).filter(Boolean))];
        setCategories(distinctCats);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // 2. Fetch guides list based on query filters
  const fetchGuides = async () => {
    setLoading(true);
    try {
      let url = `/guides?page=${page}&limit=${limit}`;
      if (selectedCategory) {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      if (activeTab !== 'all') {
        url += `&access_level=${activeTab}`;
      }
      
      const res = await client.get(url);
      setGuides(res.data.data || []);
      
      const pag = res.data.pagination;
      if (pag) {
        setTotal(pag.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch guides list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, [page, selectedCategory, activeTab]);

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const isTeacherOrAdmin = user && (user.role === 'teacher' || user.role === 'admin');

  return (
    <div className="guides-container">
      
      {/* Header Row */}
      <div className="guides-header-row">
        <div className="guides-title-block">
          <h2 className="guides-title">{t('guides.libraryTitle')}</h2>
          <p className="guides-subtitle">{t('guides.librarySubtitle')}</p>
        </div>
        {isTeacherOrAdmin && (
          <button
            className="btn-create-guide"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={16} />
            <span>{t('guides.newGuide')}</span>
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="guides-filter-row">
        {/* Access level Tabs */}
        <div className="guides-tabs">
          <button
            className={`guide-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            {t('guides.tabAll')}
          </button>
          <button
            className={`guide-tab-btn ${activeTab === 'free' ? 'active' : ''}`}
            onClick={() => handleTabChange('free')}
          >
            {t('guides.tabFree')}
          </button>
          <button
            className={`guide-tab-btn ${activeTab === 'pro' ? 'active' : ''}`}
            onClick={() => handleTabChange('pro')}
          >
            {t('guides.tabPro')}
          </button>
        </div>

        {/* Category Dropdown */}
        <div className="category-filter-wrapper">
          <select
            className="category-select"
            value={selectedCategory}
            onChange={handleCategoryChange}
          >
            <option value="">{t('guides.allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Guides Grid/List */}
      {loading ? (
        <div className="empty-state-card">{t('common.loading')}</div>
      ) : guides.length === 0 ? (
        <div className="empty-state-card">
          <BookOpen size={48} style={{ opacity: 0.4, color: 'var(--color-primary)', marginBottom: '16px' }} />
          <h3>{t('guides.noGuides')}</h3>
          <p>{t('guides.noGuidesDesc')}</p>
        </div>
      ) : (
        <div className="guides-list">
          {guides.map((g) => {
            const isPro = g.access_level === 'pro';
            const minLvl = g.min_level != null ? g.min_level : 1;
            const userLvl = user ? (user.role === 'student' ? getLevel(user.level_points || 0) : 99) : null;
            const isLocked = g.locked || (!isTeacherOrAdmin && minLvl > 0 && userLvl === null) || (!isTeacherOrAdmin && minLvl >= 2 && userLvl !== null && userLvl < minLvl);
            return (
              <div
                key={g.id}
                className="guide-card-horizontal"
                onClick={() => navigate(`/guides/${g.id}`)}
                style={isLocked ? { opacity: 0.85, cursor: 'pointer' } : {}}
              >
                {/* Left side: Icon */}
                <div className="guide-card-icon-container">
                  <div className={`guide-card-icon-circle ${isPro ? 'icon-pro' : 'icon-free'}`}>
                    {isLocked ? <Lock size={24} /> : <FileText size={24} />}
                  </div>
                </div>

                {/* Center side: Text details */}
                <div className="guide-card-body">
                  <span className="guide-card-category">{g.category || t('guides.general')}</span>
                  <h4 className="guide-card-title">{g.title}</h4>
                  {isLocked ? (
                    <p className="guide-card-description" style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                      {minLvl === 1 ? 'Yêu cầu đăng nhập để tải xuống.' : `Yêu cầu Level ${minLvl} để tải xuống.`}
                    </p>
                  ) : (
                    <p className="guide-card-description">{g.description || t('guides.noDescription')}</p>
                  )}
                </div>

                {/* Right side: Badge and Button */}
                <div className="guide-card-actions">
                  {minLvl > 1 && <LevelBadge level={minLvl} size="sm" />}
                  <span className={`guide-access-badge badge-${g.access_level}`}>
                    {isPro ? <Lock size={12} style={{ marginRight: '4px' }} /> : <Unlock size={12} style={{ marginRight: '4px' }} />}
                    {g.access_level.toUpperCase()}
                  </span>
                  <button className="guide-card-btn-view">
                    <span>{t('guides.viewBtn')}</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Row */}
      {total > limit && (
        <div className="guides-pagination">
          <button
            className="btn-guides-page"
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            disabled={page === 1}
          >
            &larr; {t('guides.prevPage')}
          </button>
          <span className="guides-page-indicator">
            {t('guides.pageInfo', { page, total: Math.ceil(total / limit) })}
          </span>
          <button
            className="btn-guides-page"
            onClick={() => setPage(prev => Math.min(prev + 1, Math.ceil(total / limit)))}
            disabled={page >= Math.ceil(total / limit)}
          >
            {t('guides.nextPage')} &rarr;
          </button>
        </div>
      )}

      {/* Modal Form */}
      <GuideFormModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchGuides}
      />

    </div>
  );
};

export default GuidesPage;
