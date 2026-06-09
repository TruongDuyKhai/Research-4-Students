import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';

export default function Footer() {
  const { lang } = useLang();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          {/* Logo same as navbar */}
          <Link to="/" className="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="var(--accent)"/>
              <path d="M2 17L12 22L22 17" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Research 4 <span>Students</span>
          </Link>
          
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', textAlign: 'center' }}>
            {lang === 'vi' ? 'Nền tảng chia sẻ kiến thức dành cho sinh viên' : 'Knowledge sharing platform for students'}
          </p>
          
          <nav className="footer-links">
            <Link to="/community" className="footer-link">{lang === 'vi' ? 'Cộng đồng' : 'Community'}</Link>
            <Link to="/research/documents" className="footer-link">{lang === 'vi' ? 'Tài liệu' : 'Documents'}</Link>
            <Link to="/research/qa" className="footer-link">{lang === 'vi' ? 'Hỏi đáp' : 'Q&A'}</Link>
            <Link to="/research/reviews" className="footer-link">{lang === 'vi' ? 'Đánh giá' : 'Reviews'}</Link>
          </nav>
          
          <div className="copyright">© 2025 Research 4 Students. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
