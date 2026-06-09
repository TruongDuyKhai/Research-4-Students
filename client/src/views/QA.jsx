import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

const SUBJECT_OPTIONS = [
  'All Subjects',
  'Academic Writing',
  'Computer Science',
  'Biomedical Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Others'
];

const ASK_SUBJECT_OPTIONS = [
  'Academic Writing',
  'Computer Science',
  'Biomedical Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Others'
];

export default function QA() {
  const { user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

  const getSubjectLabel = (subj) => {
    if (subj === 'All Subjects') return lang === 'vi' ? 'Tất cả môn học' : 'All Subjects';
    if (subj === 'Computer Science') return lang === 'vi' ? 'Khoa học máy tính' : 'Computer Science';
    if (subj === 'Biomedical Engineering') return lang === 'vi' ? 'Kỹ thuật y sinh' : 'Biomedical Engineering';
    if (subj === 'Mathematics') return lang === 'vi' ? 'Toán học' : 'Mathematics';
    if (subj === 'Physics') return lang === 'vi' ? 'Vật lý' : 'Physics';
    if (subj === 'Chemistry') return lang === 'vi' ? 'Hóa học' : 'Chemistry';
    if (subj === 'Academic Writing') return lang === 'vi' ? 'Viết học thuật' : 'Academic Writing';
    if (subj === 'Others') return lang === 'vi' ? 'Khác' : 'Others';
    return subj;
  };

  // State
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All Subjects');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbSubjects, setDbSubjects] = useState([]);

  // Ask Question Modal State
  const [showAskModal, setShowAskModal] = useState(false);
  const [askTitle, setAskTitle] = useState('');
  const [askSubject, setAskSubject] = useState('Academic Writing');
  const [askContent, setAskContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [askError, setAskError] = useState('');

  const fetchQuestions = async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const subjFilter = subject === 'All Subjects' ? 'All' : subject;
      const res = await axios.get(
        `/api/qa/questions?search=${encodeURIComponent(search)}&subject=${encodeURIComponent(subjFilter)}&page=${pageNum}&limit=10`
      );

      const { questions: list, pagination, subjects } = res.data;

      if (append) {
        setQuestions(prev => [...prev, ...list]);
      } else {
        setQuestions(list);
      }

      setHasMore(pageNum < pagination.pages);
      setPage(pageNum);
      if (subjects) setDbSubjects(subjects);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions(1, false);
  }, [search, subject]);

  const loadMore = () => {
    if (loading) return;
    fetchQuestions(page + 1, true);
  };

  const handleOpenAsk = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowAskModal(true);
  };

  const handleAskSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setAskError('');
    if (!askTitle.trim()) {
      setAskError(lang === 'vi' ? 'Tiêu đề câu hỏi là bắt buộc.' : 'Question title is required.');
      return;
    }
    if (!askContent.trim()) {
      setAskError(lang === 'vi' ? 'Nội dung chi tiết là bắt buộc.' : 'Detailed content is required.');
      return;
    }

    setCreating(true);
    try {
      const res = await axios.post('/api/qa/questions', {
        title: askTitle.trim(),
        subject: askSubject,
        content: askContent.trim()
      });

      // Insert new question locally
      setQuestions(prev => [res.data, ...prev]);

      // Reset form & close modal
      setAskTitle('');
      setAskSubject('Academic Writing');
      setAskContent('');
      setShowAskModal(false);

      alert(lang === 'vi' ? 'Đăng câu hỏi thành công!' : 'Question posted successfully!');
    } catch (err) {
      setAskError(err.response?.data?.error || (lang === 'vi' ? 'Không thể đăng câu hỏi.' : 'Failed to post question.'));
    } finally {
      setCreating(false);
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

  // Merge default filter options with ones from DB
  const allSubjects = Array.from(new Set([...SUBJECT_OPTIONS, ...dbSubjects]));

  return (
    <main className="main-content container">
      {/* Inject Scoped Styles */}
      <style>{`
        .q-header-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; text-align: left; }
        .filters { display:flex; gap:1rem; margin-bottom:2rem; flex-wrap:wrap; background:var(--card-bg); padding:1.5rem; border-radius:12px; border:1px solid var(--border-color); align-items:center; }
        .filter-group { flex:1; min-width:200px; }
        .qa-card-list { display:flex; flex-direction:column; gap:1rem; }
        .qa-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; cursor: pointer; transition: border-color 0.2s, transform 0.15s; text-align: left; }
        .qa-card:hover { border-color: var(--accent); transform: translateY(-2px); }
        .avatar-sm { width:24px; height:24px; border-radius:50%; object-fit:cover; }
        .load-more { text-align:center; margin-top:3rem; }
        
        /* Modal Styles */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:2000; opacity:0; visibility:hidden; transition:0.3s; padding:1rem; }
        .modal-overlay.show { opacity:1; visibility:visible; }
        .modal-content { background:var(--card-bg); width:100%; max-width:550px; border-radius:12px; border:1px solid var(--border-color); overflow:hidden; transform:translateY(20px); transition:0.3s; }
        .modal-overlay.show .modal-content { transform:translateY(0); }
        .modal-header { padding:1.5rem; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; }
        .close-modal { font-size:1.5rem; color:var(--text-secondary); cursor:pointer; background: none; border: none; }
        .close-modal:hover { color:var(--text-primary); }
        .modal-body { padding:1.5rem; text-align: left; }
        .modal-footer { padding:1.5rem; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap: 0.5rem; }
        .modal-textarea { width: 100%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); padding: 0.8rem; font-family: inherit; font-size: 0.95rem; resize: vertical; min-height: 150px; }
        .modal-textarea:focus { outline: none; border-color: var(--accent); }
      `}</style>

      <div className="q-header-row">
        <h1 style={{ fontSize: '2rem', margin: 0 }}>
          {lang === 'vi' ? 'Hỏi đáp' : 'Q&A'}
        </h1>
        <button className="btn btn-primary" onClick={handleOpenAsk}>{lang === 'vi' ? 'Đặt câu hỏi' : 'Ask Question'}</button>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <input 
            type="text" 
            className="form-control" 
            placeholder={lang === 'vi' ? 'Tìm kiếm câu hỏi...' : 'Search questions...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select 
            className="form-control"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            {allSubjects.map(opt => (
              <option key={opt} value={opt}>{getSubjectLabel(opt)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Question list */}
      {questions.length === 0 && !loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {lang === 'vi' ? 'Chưa có câu hỏi nào thảo luận ở đây. Hãy mở màn bằng câu hỏi của bạn!' : 'No questions discussed here yet. Start by asking yours!'}
        </div>
      ) : (
        <div className="qa-card-list">
          {questions.map(q => (
            <div 
              key={q.id} 
              className="card qa-card" 
              onClick={() => navigate(`/research/qa/${q.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="tag">{getSubjectLabel(q.subject)}</span>
                    {q.hasAccepted > 0 && (
                      <span className="role-badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success-color)' }}>
                        ✓ {lang === 'vi' ? 'Đã giải quyết' : 'Resolved'}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>{q.title}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <img 
                      className="avatar-sm" 
                      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} 
                      src={q.avatar || '/uploads/avatar_default.png'}
                      alt={q.full_name}
                    />
                    @{q.username} &bull; {timeAgo(q.created_at)}
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', flexShrink: 0, marginLeft: '1rem', minWidth: '60px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: q.hasAccepted > 0 ? 'var(--success-color)' : 'var(--text-primary)' }}>
                    {q.answer_count}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '2px' }}>
                    {lang === 'vi' ? 'Trả lời' : 'Answers'}
                  </div>
                </div>
              </div>
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

      {/* Ask Question Modal */}
      <div className={`modal-overlay ${showAskModal ? 'show' : ''}`} onClick={() => setShowAskModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{lang === 'vi' ? 'Đặt câu hỏi mới' : 'Ask New Question'}</h2>
            <button className="close-modal" onClick={() => setShowAskModal(false)}>&times;</button>
          </div>
          
          <form onSubmit={handleAskSubmit}>
            <div className="modal-body">
              {askError && (
                <div style={{ color: 'var(--error-color)', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid var(--error-color)', padding: '0.5rem 1rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)' }}>
                  {askError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>{lang === 'vi' ? 'Chủ đề' : 'Subject'}</div>
                </label>
                <select 
                  className="form-control"
                  value={askSubject}
                  onChange={(e) => setAskSubject(e.target.value)}
                >
                  {ASK_SUBJECT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{getSubjectLabel(opt)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>{lang === 'vi' ? 'Tiêu đề câu hỏi' : 'Question Title'}</div>
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={lang === 'vi' ? 'Đặt tiêu đề ngắn gọn, rõ ràng về vấn đề...' : 'Enter a brief, clear title...'} 
                  value={askTitle}
                  onChange={(e) => setAskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>{lang === 'vi' ? 'Chi tiết câu hỏi' : 'Question Details'}</div>
                </label>
                <textarea 
                  className="modal-textarea" 
                  placeholder={lang === 'vi' ? 'Mô tả chi tiết câu hỏi của bạn. Cung cấp thêm thông tin bối cảnh hoặc code mẫu nếu cần...' : 'Describe your question in detail. Provide context or code samples if needed...'} 
                  value={askContent}
                  onChange={(e) => setAskContent(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => setShowAskModal(false)}
                disabled={creating}
              >
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={creating}
              >
                {creating ? (lang === 'vi' ? 'Đang gửi...' : 'Submitting...') : (lang === 'vi' ? 'Gửi câu hỏi' : 'Submit Question')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
