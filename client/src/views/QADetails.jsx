import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

export default function QADetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

  // State
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [newAnswerContent, setNewAnswerContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchQuestionAndAnswers = async () => {
    setLoading(true);
    try {
      const qRes = await axios.get(`/api/qa/questions/${id}`);
      setQuestion(qRes.data);

      const aRes = await axios.get(`/api/qa/questions/${id}/answers`);
      setAnswers(aRes.data);
    } catch (err) {
      console.error('Failed to load Q&A details:', err);
      setError(lang === 'vi' ? 'Không thể tải chi tiết câu hỏi.' : 'Failed to load question details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionAndAnswers();
  }, [id]);

  const handlePostAnswer = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!newAnswerContent.trim()) return;

    setSubmitting(true);
    try {
      const res = await axios.post(`/api/qa/questions/${id}/answers`, {
        content: newAnswerContent.trim()
      });

      // Append new answer locally
      setAnswers(prev => [...prev, res.data]);
      setNewAnswerContent('');
      
      // Update answers count locally
      setQuestion(prev => prev ? { ...prev, answer_count: prev.answer_count + 1 } : null);
    } catch (err) {
      alert(err.response?.data?.error || (lang === 'vi' ? 'Không thể đăng câu trả lời.' : 'Failed to post answer.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAnswer = async (answerId) => {
    if (!window.confirm(lang === 'vi' ? 'Chấp nhận câu trả lời này làm lời giải chính thức?' : 'Accept this answer as the official solution?')) return;

    try {
      await axios.post(`/api/qa/answers/${answerId}/accept`);
      
      // Update local answers list state (set accepted to 1 for this, 0 for others)
      setAnswers(prev => 
        prev.map(a => a.id === answerId ? { ...a, is_accepted: 1 } : { ...a, is_accepted: 0 })
            .sort((a, b) => b.is_accepted - a.is_accepted) // Keep accepted at the top
      );

      // Set hasAccepted state on the question
      setQuestion(prev => prev ? { ...prev, hasAccepted: 1 } : null);
    } catch (err) {
      alert(err.response?.data?.error || (lang === 'vi' ? 'Không thể chấp nhận câu trả lời.' : 'Failed to accept answer.'));
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

  if (loading) {
    return (
      <div className="container" style={{ marginTop: '100px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        {lang === 'vi' ? 'Đang tải dữ liệu...' : 'Loading data...'}
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="container" style={{ marginTop: '100px', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem', border: '1px solid var(--error-color)' }}>
          <p style={{ color: 'var(--error-color)' }}>{error || (lang === 'vi' ? 'Câu hỏi không tồn tại.' : 'Question does not exist.')}</p>
          <Link to="/research/qa" className="btn btn-outline" style={{ display: 'inline-block', marginTop: '1rem' }}>
            {lang === 'vi' ? 'Quay lại hỏi đáp' : 'Back to Q&A'}
          </Link>
        </div>
      </div>
    );
  }

  const isQuestionOwner = user && question.user_id === user.id;

  return (
    <main className="main-content container">
      {/* Inject Scoped Styles */}
      <style>{`
        .qa-detail-wrapper { text-align: left; max-width: 900px; margin: 0 auto; }
        .back-link { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); text-decoration: none; font-size: 0.9rem; margin-bottom: 1.5rem; transition: color 0.2s; }
        .back-link:hover { color: var(--accent); }
        .q-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 2rem; margin-bottom: 2rem; position: relative; }
        .q-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary); line-height: 1.3; }
        .q-body { font-size: 1.05rem; line-height: 1.7; color: var(--text-primary); margin-bottom: 1.5rem; white-space: pre-wrap; word-break: break-word; }
        .ans-header { font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--text-primary); }
        .ans-list { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2.5rem; }
        .ans-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; transition: border-color 0.2s; position: relative; }
        .ans-card.accepted { border-left: 3px solid var(--success-color); padding-left: 1.5rem; }
        .ans-body { font-size: 0.95rem; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; margin-bottom: 1rem; }
        .avatar-sm { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
        .ans-form-container { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; }
        .ans-textarea { width: 100%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); padding: 1rem; font-family: inherit; font-size: 0.95rem; resize: vertical; min-height: 120px; margin-bottom: 1rem; }
        .ans-textarea:focus { outline: none; border-color: var(--accent); }
      `}</style>

      <div className="qa-detail-wrapper">
        <Link to="/research/qa" className="back-link">
          <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          {lang === 'vi' ? 'Quay lại Hỏi đáp' : 'Back to Q&A'}
        </Link>

        {/* Full Question Card */}
        <div className="card q-card">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
            <span className="tag">{lang === 'vi' && question.subject === 'Academic Writing' ? 'Viết học thuật' : question.subject}</span>
            {question.hasAccepted > 0 && (
              <span className="role-badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success-color)' }}>
                ✓ {lang === 'vi' ? 'Đã giải quyết' : 'Resolved'}
              </span>
            )}
          </div>
          <h1 className="q-title">{question.title}</h1>
          <div className="q-body">{question.content}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img 
                className="avatar-sm"
                src={question.avatar || '/uploads/avatar_default.png'}
                alt={question.full_name}
              />
              <span>@{question.username} ({question.full_name})</span>
            </div>
            <span>{lang === 'vi' ? 'Đăng' : 'Posted'} {timeAgo(question.created_at)}</span>
          </div>
        </div>

        {/* Answers List */}
        <div className="ans-header">
          {question.answer_count} {lang === 'vi' ? 'Câu trả lời' : 'Answers'}
        </div>

        <div className="ans-list">
          {answers.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {lang === 'vi' ? 'Chưa có câu trả lời nào. Hãy chia sẻ lời giải của bạn!' : 'No answers yet. Share your solution!'}
            </div>
          ) : (
            answers.map(ans => (
              <div 
                key={ans.id} 
                className={`card ans-card ${ans.is_accepted === 1 ? 'accepted' : ''}`}
              >
                <div className="ans-body">{ans.content}</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img 
                      className="avatar-sm"
                      src={ans.avatar || '/uploads/avatar_default.png'}
                      alt={ans.full_name}
                    />
                    <span>
                      @{ans.username} {ans.role === 'teacher' && <span className="role-badge" style={{ fontSize: '0.65rem', padding: '1px 6px', margin: '0 4px' }}>Advisor</span>}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span>{lang === 'vi' ? 'Trả lời' : 'Answered'} {timeAgo(ans.created_at)}</span>
                    
                    {/* Render Accept controls */}
                    {ans.is_accepted === 1 ? (
                      <span style={{ color: 'var(--success-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ {lang === 'vi' ? 'Lời giải' : 'Solution'}
                      </span>
                    ) : (
                      isQuestionOwner && (
                        <button 
                          className="btn btn-outline"
                          style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', border: '1px solid var(--border-color)' }}
                          onClick={() => handleAcceptAnswer(ans.id)}
                        >
                          {lang === 'vi' ? 'Chấp nhận' : 'Accept'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Answer Form */}
        <div className="ans-form-container">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            {lang === 'vi' ? 'Trả lời câu hỏi này' : 'Answer this question'}
          </h3>
          
          {user ? (
            <form onSubmit={handlePostAnswer}>
              <textarea 
                className="ans-textarea"
                placeholder={lang === 'vi' ? 'Viết lời giải hoặc ý kiến phản hồi của bạn chi tiết tại đây...' : 'Write your detailed answer or feedback here...'}
                value={newAnswerContent}
                onChange={(e) => setNewAnswerContent(e.target.value)}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (lang === 'vi' ? 'Đang gửi...' : 'Submitting...') : (lang === 'vi' ? 'Đăng câu trả lời' : 'Post Answer')}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: '12px', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                {lang === 'vi' ? 'Đăng nhập để trả lời câu hỏi này' : 'Log in to answer this question'}
              </span>
              <Link to="/login" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>{lang === 'vi' ? 'Đăng nhập' : 'Log In'}</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
