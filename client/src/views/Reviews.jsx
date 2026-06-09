import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

export default function Reviews() {
  const { user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

  // State
  const [reviews, setReviews] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  // Write Review Modal State
  const [showModal, setShowModal] = useState(false);
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchReviews = async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/reviews?search=${encodeURIComponent(search)}&rating=${encodeURIComponent(ratingFilter)}&page=${pageNum}&limit=10`
      );

      const { reviews: list, summaries: summaryList, pagination } = res.data;

      if (append) {
        setReviews(prev => [...prev, ...list]);
      } else {
        setReviews(list);
      }
      
      setSummaries(summaryList);
      setHasMore(pageNum < pagination.pages);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(1, false);
  }, [search, ratingFilter]);

  const loadMore = () => {
    if (loading) return;
    fetchReviews(page + 1, true);
  };

  const handleOpenModal = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowModal(true);
  };

  const handleWriteSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setError('');
    if (!subjectCode.trim()) {
      setError(lang === 'vi' ? 'Mã môn học là bắt buộc.' : 'Subject code is required.');
      return;
    }
    if (!subjectName.trim()) {
      setError(lang === 'vi' ? 'Tên môn học là bắt buộc.' : 'Subject name is required.');
      return;
    }
    if (!content.trim()) {
      setError(lang === 'vi' ? 'Nội dung đánh giá là bắt buộc.' : 'Review content is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/api/reviews', {
        subject_code: subjectCode.trim().toUpperCase(),
        subject_name: subjectName.trim(),
        rating,
        content: content.trim()
      });

      // Insert new review locally
      setReviews(prev => [res.data, ...prev]);
      
      // Refresh summaries
      fetchReviews(1, false);

      // Reset form & close modal
      setSubjectCode('');
      setSubjectName('');
      setRating(5);
      setContent('');
      setShowModal(false);

      alert(lang === 'vi' ? 'Đăng đánh giá môn học thành công!' : 'Subject review posted successfully!');
    } catch (err) {
      setError(err.response?.data?.error || (lang === 'vi' ? 'Không thể đăng đánh giá.' : 'Failed to post review.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm(lang === 'vi' ? 'Bạn có chắc chắn muốn xóa đánh giá này?' : 'Are you sure you want to delete this review?')) return;
    try {
      await axios.delete(`/api/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      fetchReviews(1, false); // refresh summaries
    } catch (err) {
      alert(err.response?.data?.error || (lang === 'vi' ? 'Không thể xóa đánh giá.' : 'Failed to delete review.'));
    }
  };

  const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return lang === 'vi' ? 'Vừa xong' : 'Just now';
    if (diffMins < 60) return lang === 'vi' ? `${diffMins} phút trước` : `${diffMins}m ago`;
    if (diffHours < 24) return lang === 'vi' ? `${diffHours} giờ trước` : `${diffHours}h ago`;
    return lang === 'vi' ? `${diffDays} ngày trước` : `${diffDays}d ago`;
  };

  // Helper to render stars SVG
  const renderStars = (score) => {
    const stars = [];
    const rounded = Math.round(score);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg 
          key={i} 
          fill={i <= rounded ? 'var(--accent)' : 'none'} 
          stroke="var(--accent)" 
          strokeWidth="2"
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '16px', height: '16px', marginRight: '2px', display: 'inline-block', verticalAlign: 'middle' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.197-.39.73-.39.927 0l2.184 4.327 4.725.683c.433.063.606.585.293.89l-3.42 3.332.808 4.708c.074.433-.382.764-.766.56L12 15.657l-4.225 2.22c-.384.204-.84-.127-.766-.56l.808-4.708-3.42-3.332c-.313-.305-.14-.827.293-.89l4.725-.683 2.184-4.327z"></path>
        </svg>
      );
    }
    return stars;
  };

  return (
    <main className="main-content container">
      {/* Inject Scoped Styles */}
      <style>{`
        .r-header-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; text-align: left; }
        .filters { display:flex; gap:1rem; margin-bottom:2rem; flex-wrap:wrap; background:var(--card-bg); padding:1.5rem; border-radius:12px; border:1px solid var(--border-color); align-items:center; }
        .filter-group { flex:1; min-width:200px; }
        .grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:1.5rem; }
        .summary-card { cursor:pointer; transition:all 0.2s; text-align: left; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; }
        .summary-card:hover { transform:translateY(-4px); border-color:var(--accent); }
        .review-list { display:flex; flex-direction:column; gap:1rem; text-align: left; }
        .review-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; }
        .avatar-sm { width:24px; height:24px; border-radius:50%; object-fit:cover; }
        .load-more { text-align:center; margin-top:3rem; }
        
        /* Modal Styles */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:2000; opacity:0; visibility:hidden; transition:0.3s; padding:1rem; }
        .modal-overlay.show { opacity:1; visibility:visible; }
        .modal-content { background:var(--card-bg); width:100%; max-width:500px; border-radius:12px; border:1px solid var(--border-color); overflow:hidden; transform:translateY(20px); transition:0.3s; }
        .modal-overlay.show .modal-content { transform:translateY(0); }
        .modal-header { padding:1.5rem; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; }
        .close-modal { font-size:1.5rem; color:var(--text-secondary); cursor:pointer; background: none; border: none; }
        .close-modal:hover { color:var(--text-primary); }
        .modal-body { padding:1.5rem; text-align: left; }
        .modal-footer { padding:1.5rem; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap: 0.5rem; }
        
        /* Interactive Rating Picker */
        .star-picker { display: flex; gap: 0.25rem; font-size: 1.75rem; color: var(--text-muted); cursor: pointer; }
        .star-picker svg { width: 32px; height: 32px; fill: none; stroke: var(--text-muted); stroke-width: 1.5; transition: fill 0.1s, stroke 0.1s; }
        .star-picker svg.active { fill: var(--accent); stroke: var(--accent); }
        .modal-textarea { width: 100%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); padding: 0.8rem; font-family: inherit; font-size: 0.95rem; resize: vertical; min-height: 120px; }
        .modal-textarea:focus { outline: none; border-color: var(--accent); }
        
        @media (max-width:992px) { .grid { grid-template-columns:repeat(2, 1fr); } }
        @media (max-width:768px) { .grid { grid-template-columns:1fr; } }
      `}</style>

      <div className="r-header-row">
        <h1 style={{ fontSize: '2rem', margin: 0 }}>
          {lang === 'vi' ? 'Đánh giá môn học' : 'Subject Reviews'}
        </h1>
        <button className="btn btn-primary" onClick={handleOpenModal}>{lang === 'vi' ? 'Viết đánh giá' : 'Write Review'}</button>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <input 
            type="text" 
            className="form-control" 
            placeholder={lang === 'vi' ? 'Tìm kiếm theo mã môn, tên môn, nội dung...' : 'Search by subject code, name, content...'} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select 
            className="form-control"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
          >
            <option value="All">{lang === 'vi' ? 'Tất cả đánh giá' : 'All Ratings'}</option>
            <option value="5">{lang === 'vi' ? '5 Sao' : '5 Stars'}</option>
            <option value="4">{lang === 'vi' ? '4 Sao' : '4 Stars'}</option>
            <option value="3">{lang === 'vi' ? '3 Sao' : '3 Stars'}</option>
            <option value="2">{lang === 'vi' ? '2 Sao' : '2 Stars'}</option>
            <option value="1">{lang === 'vi' ? '1 Sao' : '1 Star'}</option>
          </select>
        </div>
      </div>

      {/* Subject summary cards grid */}
      {summaries.length > 0 && (
        <div style={{ textAlign: 'left', marginBottom: '1rem', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
          {lang === 'vi' ? 'Tóm tắt môn học' : 'Subject Summaries'}
        </div>
      )}
      <div className="grid" style={{ marginBottom: '2.5rem' }}>
        {summaries.map(s => (
          <div 
            key={s.subject_code} 
            className="card summary-card"
            onClick={() => setSearch(s.subject_code)}
            title={`Click to filter reviews for ${s.subject_code}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span className="tag">{s.subject_code}</span>
                <h3 style={{ marginTop: '0.5rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.subject_name}</h3>
              </div>
              <div style={{ fontSize: '1.5rem', fontSpread: 'narrow', fontWeight: 800, color: 'var(--accent)' }}>
                {s.avg_rating}
              </div>
            </div>
            {/* Star Display */}
            <div>{renderStars(s.avg_rating)}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.8rem' }}>
              {s.review_count} {lang === 'vi' ? 'đánh giá' : 'reviews'}
            </div>
          </div>
        ))}
      </div>

      {/* Individual reviews */}
      <div style={{ textAlign: 'left', marginBottom: '1rem', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
        {lang === 'vi' ? 'Đánh giá chi tiết' : 'Detailed Reviews'}
      </div>

      {reviews.length === 0 && !loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {lang === 'vi' ? 'Chưa có đánh giá nào phù hợp bộ lọc.' : 'No reviews matched the filter.'}
        </div>
      ) : (
        <div className="review-list">
          {reviews.map(r => (
            <div key={r.id} className="card review-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <img 
                    className="avatar-sm" 
                    style={{ width: '40px', height: '40px' }} 
                    src={r.avatar || '/uploads/avatar_default.png'}
                    alt={r.full_name}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.full_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      @{r.username} &bull; {timeAgo(r.created_at)}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div>{renderStars(r.rating)}</div>
                  
                  {/* Delete Button (Owner/Admin) */}
                  {user && (r.user_id === user.id || user.role === 'admin') && (
                    <button 
                      onClick={() => handleDeleteReview(r.id)}
                      style={{ color: 'var(--error-color)', fontSize: '1.2rem', padding: '0 0.4rem', background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Delete Review"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span className="tag">{r.subject_code}</span>
                <span className="tag" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>{r.subject_name}</span>
              </div>
              
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>{r.content}</p>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="load-more">
          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.8rem 2rem' }} onClick={loadMore} disabled={loading}>
            {loading ? (lang === 'vi' ? 'Đang tải...' : 'Loading...') : (lang === 'vi' ? 'Tải thêm' : 'Load More')}
          </button>
        </div>
      )}

      {/* Write Review Modal */}
      <div className={`modal-overlay ${showModal ? 'show' : ''}`} onClick={() => setShowModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{lang === 'vi' ? 'Viết đánh giá môn học' : 'Write Subject Review'}</h2>
            <button className="close-modal" onClick={() => setShowModal(false)}>&times;</button>
          </div>
          
          <form onSubmit={handleWriteSubmit}>
            <div className="modal-body">
              {error && (
                <div style={{ color: 'var(--error-color)', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid var(--error-color)', padding: '0.5rem 1rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)' }}>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>{lang === 'vi' ? 'Mã môn học' : 'Subject Code'}</div>
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={lang === 'vi' ? 'Ví dụ: CS302, BIO202...' : 'E.g., CS302, BIO202...'} 
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>{lang === 'vi' ? 'Tên môn học' : 'Subject Name'}</div>
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={lang === 'vi' ? 'Ví dụ: Cơ sở dữ liệu...' : 'E.g., Database Systems...'} 
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <div>{lang === 'vi' ? 'Đánh giá sao' : 'Star Rating'}</div>
                </label>
                
                <div className="star-picker">
                  {[1, 2, 3, 4, 5].map(starNum => {
                    const isActive = hoverRating > 0 ? starNum <= hoverRating : starNum <= rating;
                    return (
                      <svg
                        key={starNum}
                        className={isActive ? 'active' : ''}
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        onClick={() => setRating(starNum)}
                        onMouseEnter={() => setHoverRating(starNum)}
                        onMouseLeave={() => setHoverRating(0)}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.197-.39.73-.39.927 0l2.184 4.327 4.725.683c.433.063.606.585.293.89l-3.42 3.332.808 4.708c.074.433-.382.764-.766.56L12 15.657l-4.225 2.22c-.384.204-.84-.127-.766-.56l.808-4.708-3.42-3.332c-.313-.305-.14-.827.293-.89l4.725-.683 2.184-4.327z"></path>
                      </svg>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>{lang === 'vi' ? 'Nội dung đánh giá' : 'Review Content'}</div>
                </label>
                <textarea 
                  className="modal-textarea" 
                  placeholder={lang === 'vi' ? 'Mô tả trải nghiệm của bạn về môn học, giáo trình, bài tập, giảng viên...' : 'Describe your experience with the subject, syllabus, assignments, lecturer...'} 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (lang === 'vi' ? 'Đang gửi...' : 'Submitting...') : (lang === 'vi' ? 'Đăng đánh giá' : 'Post Review')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
