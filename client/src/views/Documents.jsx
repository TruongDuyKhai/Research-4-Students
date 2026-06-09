import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

const SUBJECT_OPTIONS = [
  'All Subjects',
  'Computer Science',
  'Biomedical Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Academic Writing',
  'Others'
];

const TYPE_OPTIONS = [
  'All Types',
  'Lecture Note',
  'Textbook',
  'Syllabus',
  'Past Exam',
  'Lab Report',
  'Thesis / Report'
];

const UPLOAD_TYPE_OPTIONS = [
  'Lecture Note',
  'Textbook',
  'Syllabus',
  'Past Exam',
  'Lab Report',
  'Thesis / Report'
];

export default function Documents() {
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

  const getTypeLabel = (type) => {
    if (type === 'All Types') return lang === 'vi' ? 'Tất cả loại tài liệu' : 'All Types';
    if (type === 'Lecture Note') return lang === 'vi' ? 'Bài giảng' : 'Lecture Note';
    if (type === 'Textbook') return lang === 'vi' ? 'Sách giáo trình' : 'Textbook';
    if (type === 'Syllabus') return lang === 'vi' ? 'Đề cương môn học' : 'Syllabus';
    if (type === 'Past Exam') return lang === 'vi' ? 'Đề thi cũ' : 'Past Exam';
    if (type === 'Lab Report') return lang === 'vi' ? 'Báo cáo thực hành' : 'Lab Report';
    if (type === 'Thesis / Report') return lang === 'vi' ? 'Khóa luận / Báo cáo' : 'Thesis / Report';
    return type;
  };

  // State for listings
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All Subjects');
  const [docType, setDocType] = useState('All Types');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic filters populated from backend database values
  const [dbSubjects, setDbSubjects] = useState([]);
  const [dbTypes, setDbTypes] = useState([]);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadType, setUploadType] = useState('Lecture Note');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Fetch documents list
  const fetchDocuments = async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      // Map 'All Subjects' -> 'All' or whatever maps to ignore filter in backend
      const subjFilter = subject === 'All Subjects' ? 'All' : subject;
      const typeFilter = docType === 'All Types' ? 'All' : docType;

      const res = await axios.get(
        `/api/documents?search=${encodeURIComponent(search)}&subject=${encodeURIComponent(subjFilter)}&type=${encodeURIComponent(typeFilter)}&page=${pageNum}&limit=9`
      );

      const { documents, pagination, filters } = res.data;

      if (append) {
        setDocs(prev => [...prev, ...documents]);
      } else {
        setDocs(documents);
      }

      setHasMore(pageNum < pagination.pages);
      setPage(pageNum);

      // Store DB filters
      if (filters.subjects) setDbSubjects(filters.subjects);
      if (filters.types) setDbTypes(filters.types);

    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch on filter changes
  useEffect(() => {
    fetchDocuments(1, false);
  }, [search, subject, docType]);

  const loadMore = () => {
    if (loading) return;
    fetchDocuments(page + 1, true);
  };

  const handleDownload = (docId) => {
    // Open in a new tab/window to trigger download attachment
    window.open(`/api/documents/${docId}/download`, '_blank');
    
    // Snappy UI: Increment download count locally
    setDocs(prev => 
      prev.map(d => d.id === docId ? { ...d, downloads: d.downloads + 1 } : d)
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setUploadError('');
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Client-side reject file > 5MB
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError(lang === 'vi' ? 'Tệp tin vượt quá giới hạn 5MB. Vui lòng chọn tệp nhỏ hơn.' : 'File exceeds 5MB limit. Please choose a smaller file.');
      setSelectedFile(null);
      e.target.value = null; // reset file input
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setUploadError('');
    if (!selectedFile) {
      setUploadError(lang === 'vi' ? 'Vui lòng chọn tệp tin cần tải lên.' : 'Please select a file to upload.');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError(lang === 'vi' ? 'Tiêu đề tài liệu là bắt buộc.' : 'Document title is required.');
      return;
    }
    if (!uploadSubject.trim()) {
      setUploadError(lang === 'vi' ? 'Môn học / Chủ đề là bắt buộc.' : 'Subject / Topic is required.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('title', uploadTitle.trim());
    formData.append('subject', uploadSubject.trim());
    formData.append('type', uploadType);
    formData.append('file', selectedFile);

    try {
      const res = await axios.post('/api/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Insert new document into local list
      setDocs(prev => [res.data, ...prev]);

      // Reset form & close modal
      setUploadTitle('');
      setUploadSubject('');
      setUploadType('Lecture Note');
      setSelectedFile(null);
      setShowUploadModal(false);

      alert(lang === 'vi' ? 'Tải lên tài liệu thành công!' : 'Document uploaded successfully!');
    } catch (err) {
      setUploadError(err.response?.data?.error || (lang === 'vi' ? 'Có lỗi xảy ra khi tải lên tài liệu.' : 'An error occurred while uploading document.'));
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleOpenUpload = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowUploadModal(true);
  };

  // Get appropriate file SVG based on extension/type
  const getFileIcon = (fileUrl) => {
    const ext = fileUrl.split('.').pop().toLowerCase();
    
    // PDF Icon (Red)
    if (ext === 'pdf') {
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: '#ef4444' }}>
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 6H8v5h1.5v-1.5H10c.8 0 1.5-.7 1.5-1.5s-.7-1.5-1.5-1.5zm0 2H8v-1h1.5c.3 0 .5.2.5.5s-.2.5-.5.5zm7 0h-1c0-.3-.2-.5-.5-.5h-1v3H15v-1h1c.3 0 .5-.2.5-.5s-.2-.5-.5-.5zm-4-2h-2v5h1.5v-1.5h.5c.8 0 1.5-.7 1.5-1.5s-.7-2-1.5-2zm-.5 2h-.5v-1h.5c.3 0 .5.2.5.5s-.2.5-.5.5zm8 6v1c0 .6-.4 1-1 1H5c-.6 0-1-.4-1-1v-1h16z"></path>
        </svg>
      );
    }
    // Word/Document Icon (Blue)
    if (['doc', 'docx', 'odt'].includes(ext)) {
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: '#3b82f6' }}>
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"></path>
        </svg>
      );
    }
    // Excel/Sheet Icon (Green)
    if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) {
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: '#10b981' }}>
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"></path>
        </svg>
      );
    }
    // PowerPoint/Presentation Icon (Orange)
    if (['ppt', 'pptx', 'odp'].includes(ext)) {
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: '#f59e0b' }}>
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"></path>
        </svg>
      );
    }
    // Archives ZIP/RAR Icon (Yellow/Amber)
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: '#d97706' }}>
          <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 4h2v2h-2v-2zm0 4h2v2h-2v-2zm-2-2h2v2h-2v-2zm0 4h2v2h-2v-2z"></path>
        </svg>
      );
    }
    // Images Icon (Purple)
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: '#8b5cf6' }}>
          <path d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 9l2.29 2.29-4.88 4.88H9v-2.41l4.88-4.88L14 9zm4.21-2.93l.73-.73c.39-.39 1.02-.39 1.41 0l1.41 1.41c.39.39.39 1.02 0 1.41l-.73.73-2.82-2.82z"></path>
        </svg>
      );
    }
    // General text/code/other icon (Grey)
    return (
      <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: '#9ca3af' }}>
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM13 9V3.5L18.5 9H13z"></path>
      </svg>
    );
  };

  // Combine default subjects with unique subjects from DB
  const allSubjects = Array.from(new Set([...SUBJECT_OPTIONS, ...dbSubjects]));
  // Combine default types with unique types from DB
  const allTypes = Array.from(new Set([...TYPE_OPTIONS, ...dbTypes]));

  return (
    <main className="main-content container">
      {/* Inject Scoped Styles */}
      <style>{`
        .page-header { margin-bottom:2rem; text-align: left; }
        .filters { display:flex; gap:1rem; margin-bottom:2rem; flex-wrap:wrap; background:var(--card-bg); padding:1.5rem; border-radius:12px; border:1px solid var(--border-color); align-items:center; }
        .filter-group { flex:1; min-width:200px; }
        .grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:1.5rem; }
        .doc-card { background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:1.5rem; display:flex; flex-direction:column; transition:transform 0.2s, border-color 0.2s; text-align: left; }
        .doc-card:hover { transform:translateY(-4px); border-color:var(--accent); }
        .doc-header { display:flex; gap:1rem; align-items:flex-start; margin-bottom:1rem; }
        .doc-icon { width:48px; height:48px; border-radius:8px; background:var(--accent-light); color:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .doc-icon svg { width:28px; height:28px; }
        .doc-title { font-weight:600; font-size:1.1rem; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; color: var(--text-primary); }
        .doc-meta { font-size:0.85rem; color:var(--text-secondary); margin-bottom:1.5rem; flex:1; display:flex; flex-direction:column; gap:0.5rem; }
        .meta-row { display:flex; align-items:center; gap:0.5rem; }
        .avatar-sm { width:24px; height:24px; border-radius:50%; object-fit:cover; }
        .load-more { text-align:center; margin-top:3rem; }
        .badge-subject { background: var(--accent-light); color: var(--accent); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
        .badge-type { background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border-color); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
        
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
        
        .file-preview-box { border: 2px dashed var(--border-color); border-radius: 8px; padding: 1.5rem; text-align: center; background: var(--bg-secondary); cursor: pointer; transition: border-color 0.2s; position: relative; }
        .file-preview-box:hover { border-color: var(--accent); }
        
        @media (max-width:992px) { .grid { grid-template-columns:repeat(2, 1fr); } }
        @media (max-width:768px) { .grid { grid-template-columns:1fr; } }
      `}</style>

      <div className="page-header">
        <h1 style={{ fontSize: '2rem' }}>
          {lang === 'vi' ? 'Tài liệu học tập' : 'Study Materials'}
        </h1>
      </div>

      {/* Filter bar */}
      <div className="filters">
        <div className="filter-group">
          <input 
            type="text" 
            className="form-control" 
            placeholder={lang === 'vi' ? 'Tìm kiếm tài liệu...' : 'Search study materials...'}
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
        <div className="filter-group">
          <select 
            className="form-control"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            {allTypes.map(opt => (
              <option key={opt} value={opt}>{getTypeLabel(opt)}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleOpenUpload}>
          {lang === 'vi' ? 'Tải lên' : 'Upload'}
        </button>
      </div>

      {/* Grid */}
      {docs.length === 0 && !loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {lang === 'vi' ? 'Không tìm thấy tài liệu phù hợp.' : 'No study materials found.'}
        </div>
      ) : (
        <div className="grid" id="docsGrid">
          {docs.map(doc => (
            <div key={doc.id} className="doc-card">
              <div className="doc-header">
                <div className="doc-icon">
                  {getFileIcon(doc.file_url)}
                </div>
                <div className="doc-title" title={doc.title}>{doc.title}</div>
              </div>
              
              <div className="doc-meta">
                <div className="meta-row">
                  <img 
                    className="avatar-sm" 
                    src={doc.avatar || '/uploads/avatar_default.png'} 
                    alt={doc.full_name}
                  />
                  <span>@{doc.username}</span>
                </div>
                <div className="meta-row" style={{ marginTop: '0.4rem', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="badge-subject">{getSubjectLabel(doc.subject)}</span>
                  <span className="badge-type">{getTypeLabel(doc.type)}</span>
                </div>
                <div className="meta-row" style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', justifyContent: 'space-between', width: '100%' }}>
                  <span>{new Date(doc.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</span>
                  <span>{doc.downloads} {lang === 'vi' ? 'lượt tải' : 'downloads'}</span>
                </div>
              </div>
              
              <button 
                className="btn btn-outline" 
                style={{ width: '100%', marginTop: 'auto' }}
                onClick={() => handleDownload(doc.id)}
              >
                {lang === 'vi' ? 'Tải xuống' : 'Download'} ({formatSize(doc.file_size)})
              </button>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="load-more">
          <button 
            className="btn btn-outline" 
            style={{ width: 'auto', padding: '0.8rem 2rem' }}
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? (lang === 'vi' ? 'Đang tải...' : 'Loading...') : (lang === 'vi' ? 'Tải thêm' : 'Load More')}
          </button>
        </div>
      )}

      {/* Upload modal */}
      <div className={`modal-overlay ${showUploadModal ? 'show' : ''}`} onClick={() => setShowUploadModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{lang === 'vi' ? 'Tải lên tài liệu' : 'Upload Material'}</h2>
            <button className="close-modal" onClick={() => setShowUploadModal(false)}>&times;</button>
          </div>
          
          <form onSubmit={handleUploadSubmit}>
            <div className="modal-body">
              {uploadError && (
                <div style={{ color: 'var(--error-color)', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid var(--error-color)', padding: '0.5rem 1rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)' }}>
                  {uploadError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>{lang === 'vi' ? 'Tiêu đề tài liệu' : 'Document Title'}</div>
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={lang === 'vi' ? 'Ví dụ: Đề cương cấu trúc dữ liệu...' : 'e.g. Data Structures Syllabus...'} 
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>{lang === 'vi' ? 'Môn học / Chủ đề' : 'Subject / Topic'}</div>
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={lang === 'vi' ? 'Ví dụ: Computer Science, Toán cao cấp...' : 'e.g. Computer Science, Calculus...'} 
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>{lang === 'vi' ? 'Loại tài liệu' : 'Document Type'}</div>
                </label>
                <select 
                  className="form-control"
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                >
                  {UPLOAD_TYPE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{getTypeLabel(opt)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <div>{lang === 'vi' ? 'Tệp tài liệu (Tối đa 5MB)' : 'Document File (Max 5MB)'}</div>
                </label>
                
                <div className="file-preview-box" onClick={() => document.getElementById('materialFileInput').click()}>
                  <input 
                    id="materialFileInput"
                    type="file" 
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*"
                  />
                  {selectedFile ? (
                    <div>
                      <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '40px', height: '40px', color: 'var(--accent)', marginBottom: '0.5rem' }}>
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"></path>
                      </svg>
                      <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedFile.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{formatSize(selectedFile.size)}</div>
                    </div>
                  ) : (
                    <div>
                      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '40px', height: '40px', color: 'var(--text-muted)', marginBottom: '0.5rem', margin: '0 auto 0.5rem auto' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                      </svg>
                      <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                        {lang === 'vi' ? 'Chọn tệp từ thiết bị của bạn' : 'Select a file from your device'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        {lang === 'vi' 
                          ? 'Hỗ trợ PDF, Word, Excel, PPT, TXT, ZIP, RAR, Ảnh' 
                          : 'Supports PDF, Word, Excel, PPT, TXT, ZIP, RAR, Images'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={uploading}
              >
                {uploading ? (lang === 'vi' ? 'Đang tải lên...' : 'Uploading...') : (lang === 'vi' ? 'Tải lên' : 'Upload')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
