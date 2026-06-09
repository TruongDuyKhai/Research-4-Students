import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

// Simple animated count-up component
function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value === undefined || value === null) return;
    let start = 0;
    const end = parseInt(value, 10);
    if (isNaN(end)) return;
    if (start === end) {
      setCount(end);
      return;
    }
    
    const duration = 1000; // 1s
    const steps = 60;
    const stepTime = duration / steps;
    const increment = Math.ceil(end / steps);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [value]);

  if (value === undefined || value === null) {
    return <span style={{ opacity: 0.5 }}>...</span>;
  }
  return <span>{count}</span>;
}

export default function Home() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [stats, setStats] = useState({ users: 0, documents: 0, questions: 0, reviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch platform stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleScrollToFeatures = (e) => {
    e.preventDefault();
    const element = document.getElementById('features-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Scoped Styles for Feature Cards & Animations */}
      <style>{`
        .home-container {
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        .hero-section {
          padding: 100px 0;
          text-align: center;
          background: radial-gradient(circle at 50% 50%, var(--accent-light) 0%, transparent 60%);
        }
        .hero-title {
          font-size: 4rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-title span.accent-word {
          color: var(--accent);
          -webkit-text-fill-color: var(--accent);
          text-shadow: var(--shadow-glow);
        }
        .hero-subtitle-primary {
          font-size: 1.5rem;
          color: var(--text-primary);
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        .hero-subtitle-secondary {
          font-size: 1.1rem;
          color: var(--text-secondary);
          font-weight: 400;
          margin-bottom: 2.5rem;
          font-style: italic;
        }
        .cta-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 3rem;
        }
        .features-area {
          background-color: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          padding: 5rem 0;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-top: 3rem;
        }
        .feature-card {
          position: relative;
          overflow: hidden;
          background-color: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2.5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          transition: transform 0.3s ease, border-color 0.3s ease;
          cursor: pointer;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background-color: var(--accent);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-8px);
          border-color: var(--accent);
        }
        .feature-card:hover::before {
          transform: scaleX(1);
        }
        .feature-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          background: var(--accent-light);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .feature-icon-wrapper svg {
          width: 32px;
          height: 32px;
        }
        .feature-title-vi {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.1rem;
        }
        .feature-title-en {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
        }
        .feature-desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 1.5rem;
          flex: 1;
        }
        .feature-stat-box {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--accent);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-primary);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          margin-bottom: 1.5rem;
          width: 100%;
        }
        .feature-stat-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .feature-links {
          display: flex;
          gap: 1rem;
          width: 100%;
        }
        .feature-link-btn {
          flex: 1;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          text-align: center;
          font-weight: 600;
          border-radius: 6px;
          transition: all 0.2s;
        }
        @media (max-width: 992px) {
          .features-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .hero-title {
            font-size: 3rem;
          }
        }
      `}</style>

      <div className="home-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="container">
            <h1 className="hero-title">
              Research 4 <span className="accent-word">Students</span>
            </h1>
            <h2 className="hero-subtitle-primary">
              {lang === 'vi' ? 'Nền tảng kết nối nghiên cứu khoa học cho sinh viên' : 'Research collaboration platform for students'}
            </h2>

            <div className="cta-group">
              <a href="#features-section" onClick={handleScrollToFeatures} className="btn btn-primary">
                {lang === 'vi' ? 'Khám phá' : 'Explore'}
              </a>
              {user ? (
                <Link to="/dashboard" className="btn btn-outline">
                  {lang === 'vi' ? 'Bảng điều khiển' : 'Dashboard'}
                </Link>
              ) : (
                <Link to="/register" className="btn btn-outline">
                  {lang === 'vi' ? 'Tham gia ngay' : 'Join Now'}
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features-section" className="features-area">
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem' }}>
                {lang === 'vi' ? 'Các chuyên mục chính' : 'Main Modules'}
              </h2>
            </div>

            <div className="features-grid">
              
              {/* Feature 1: Study Materials & Q&A */}
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"></path>
                  </svg>
                </div>
                <h3>{lang === 'vi' ? 'Tài liệu & Hỏi đáp' : 'Documents & Q&A'}</h3>
                <p className="feature-desc">
                  {lang === 'vi' 
                    ? 'Chia sẻ, tìm kiếm tài liệu học tập hữu ích và trao đổi, đặt câu hỏi giải đáp thắc mắc liên quan tới các môn học trong chương trình đào tạo.' 
                    : 'Share, search for useful study materials, and exchange academic questions related to curriculum subjects.'}
                </p>

                <div className="feature-stat-box">
                  <div>
                    <div style={{ fontSize: '1.5rem', lineHeight: 1 }}><AnimatedCounter value={stats.documents} /></div>
                    <div className="feature-stat-label">{lang === 'vi' ? 'Tài liệu' : 'Docs'}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', height: '30px', margin: '0 0.5rem' }}></div>
                  <div>
                    <div style={{ fontSize: '1.5rem', lineHeight: 1 }}><AnimatedCounter value={stats.questions} /></div>
                    <div className="feature-stat-label">{lang === 'vi' ? 'Hỏi đáp' : 'Questions'}</div>
                  </div>
                </div>

                <div className="feature-links">
                  <Link to="/research/documents" className="feature-link-btn btn-primary">
                    {lang === 'vi' ? 'Tài liệu' : 'Docs'}
                  </Link>
                  <Link to="/research/qa" className="feature-link-btn btn-outline">
                    {lang === 'vi' ? 'Hỏi đáp' : 'Q&A'}
                  </Link>
                </div>
              </div>

              {/* Feature 2: Subject Reviews */}
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.15-.363.632-.363.78 0l2.25 4.568a.5.5 0 00.378.275l5.018.73c.414.06.58.566.28.857l-3.63 3.538a.5.5 0 00-.144.442l.86 4.996c.07.41-.362.723-.732.53l-4.488-2.359a.5.5 0 00-.47 0l-4.488 2.359c-.37.193-.803-.12-.732-.53l.86-4.996a.5.5 0 00-.144-.442l-3.63-3.538c-.3-.29-.134-.797.28-.857l5.018-.73a.5.5 0 00.378-.275l2.25-4.568z"></path>
                  </svg>
                </div>
                <h3>{lang === 'vi' ? 'Đánh giá môn học' : 'Subject Reviews'}</h3>
                <p className="feature-desc">
                  {lang === 'vi' 
                    ? 'Xem và chia sẻ nhận xét chi tiết, xếp hạng độ khó, chất lượng giảng dạy của các môn học để chuẩn bị tốt nhất cho các kỳ đăng ký học phần.'
                    : 'View and share detailed feedback, difficulty ratings, and teaching quality of subjects to prepare for course registrations.'}
                </p>

                <div className="feature-stat-box">
                  <div>
                    <div style={{ fontSize: '1.5rem', lineHeight: 1 }}><AnimatedCounter value={stats.reviews} /></div>
                    <div className="feature-stat-label">{lang === 'vi' ? 'Đánh giá' : 'Reviews'}</div>
                  </div>
                </div>

                <div className="feature-links">
                  <Link to="/research/reviews" className="feature-link-btn btn-primary" style={{ flex: 'none', width: '100%' }}>
                    {lang === 'vi' ? 'Xem đánh giá' : 'View Reviews'}
                  </Link>
                </div>
              </div>

              {/* Feature 3: Connect & Chat */}
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                  </svg>
                </div>
                <h3>{lang === 'vi' ? 'Kết nối & Nhắn tin' : 'Connect & Chat'}</h3>
                <p className="feature-desc">
                  {lang === 'vi'
                    ? 'Tìm kiếm bạn bè, nhắn tin trực tuyến thời gian thực và tham gia diễn đàn thảo luận để kết nối nhóm nghiên cứu và trao đổi học thuật.'
                    : 'Search for friends, chat online in real-time, and join the discussion forum to collaborate with research teams.'}
                </p>

                <div className="feature-stat-box">
                  <div>
                    <div style={{ fontSize: '1.5rem', lineHeight: 1 }}><AnimatedCounter value={stats.users} /></div>
                    <div className="feature-stat-label">{lang === 'vi' ? 'Thành viên' : 'Members'}</div>
                  </div>
                </div>

                <div className="feature-links">
                  <Link to="/community" className="feature-link-btn btn-primary">
                    {lang === 'vi' ? 'Diễn đàn' : 'Forum'}
                  </Link>
                  <Link to="/chat" className="feature-link-btn btn-outline">
                    {lang === 'vi' ? 'Nhắn tin' : 'Chat'}
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
