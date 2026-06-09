import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

export default function SearchOverlay({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [docsResults, setDocsResults] = useState([]);
  const [qaResults, setQaResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { lang } = useLang();
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      document.body.style.overflow = 'hidden';
    } else {
      setQuery('');
      setDocsResults([]);
      setQaResults([]);
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setDocsResults([]);
      setQaResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        // Run searches in parallel
        const [docsRes, qaRes] = await Promise.all([
          axios.get(`/api/documents?search=${encodeURIComponent(query)}&limit=5`),
          axios.get(`/api/qa/questions?search=${encodeURIComponent(query)}&limit=5`)
        ]);
        
        setDocsResults(docsRes.data.documents || []);
        setQaResults(qaRes.data.questions || []);
      } catch (err) {
        console.error('Parallel search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleDocClick = (docId) => {
    onClose();
    // Trigger file download in new tab
    window.open(`/api/documents/${docId}/download`, '_blank');
  };

  const handleQaClick = (qId) => {
    onClose();
    // Navigate to Q&A details
    navigate(`/research/qa/${qId}`);
  };

  const hasResults = docsResults.length > 0 || qaResults.length > 0;

  return (
    <div className={`search-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="search-container" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-wrap">
          {/* Search Icon */}
          <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder={lang === 'vi' ? 'Tìm kiếm tài liệu & câu hỏi...' : 'Search documents & Q&A...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-close" onClick={onClose}>&times;</button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--accent)', margin: '2rem' }}>
            {lang === 'vi' ? 'Đang tìm kiếm...' : 'Searching...'}
          </div>
        )}

        <div className="search-results" style={{ display: hasResults ? 'block' : 'none' }}>
          {/* Group 1: Documents */}
          {docsResults.length > 0 && (
            <div>
              <div className="search-group-title">
                {lang === 'vi' ? `Tài liệu học tập (${docsResults.length})` : `Study Materials (${docsResults.length})`}
              </div>
              {docsResults.map((doc) => (
                <div
                  key={doc.id}
                  className="search-item"
                  onClick={() => handleDocClick(doc.id)}
                >
                  <div className="search-icon">
                    <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"></path>
                    </svg>
                  </div>
                  <div className="search-info">
                    <div className="search-title">{doc.title}</div>
                    <div className="search-desc">
                      {doc.subject} &bull; {doc.type} &bull; {lang === 'vi' ? `Tải lên bởi @${doc.username}` : `Uploaded by @${doc.username}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Group 2: Q&A */}
          {qaResults.length > 0 && (
            <div>
              <div className="search-group-title" style={{ borderTop: docsResults.length > 0 ? '1px solid var(--border-color)' : 'none' }}>
                {lang === 'vi' ? `Hỏi đáp môn học (${qaResults.length})` : `Q&A Questions (${qaResults.length})`}
              </div>
              {qaResults.map((question) => (
                <div
                  key={question.id}
                  className="search-item"
                  onClick={() => handleQaClick(question.id)}
                >
                  <div className="search-icon">
                    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l.097.003 1.25.122A12.44 12.44 0 0112 4.5c1.378 0 2.68.223 3.903.63l1.25-.122A1.5 1.5 0 0118.75 6.5v9a1.5 1.5 0 01-1.398 1.497l-.097.003-1.25-.122a12.44 12.44 0 00-3.903-.63c-1.378 0-2.68.223-3.903.63l-1.25.122A1.5 1.5 0 015.25 15.5v-9a1.5 1.5 0 011.398-1.497l.097-.003z"></path>
                    </svg>
                  </div>
                  <div className="search-info">
                    <div className="search-title">{question.title}</div>
                    <div className="search-desc">
                      {lang === 'vi' ? `Chủ đề: ${question.subject} • ${question.answer_count} trả lời • @${question.username}` : `Subject: ${question.subject} • ${question.answer_count} answers • @${question.username}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {query && !hasResults && !loading && (
          <div className="search-hint">
            {lang === 'vi' ? `Không tìm thấy kết quả nào cho "${query}"` : `No results found for "${query}"`}
          </div>
        )}

        <div className="search-hint">
          {lang === 'vi' ? 'Nhấn ESC hoặc click vùng ngoài để đóng' : 'Press ESC or click outside to close'}
        </div>
      </div>
    </div>
  );
}
