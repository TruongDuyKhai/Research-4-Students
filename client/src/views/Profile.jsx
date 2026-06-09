import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser, updateProfileState } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  
  const targetId = id || currentUser?.id;
  const isOwnProfile = currentUser && targetId == currentUser.id;

  // State
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');

  // Edit/Settings State
  const [fullName, setFullName] = useState('');
  const [major, setMajor] = useState('');
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const fetchProfileData = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/users/profile/${targetId}`);
      const data = res.data;
      
      setProfile(data.profile);
      setPosts(data.posts || []);
      setDocuments(data.documents || []);
      setQuestions(data.questions || []);
      setProjects(data.projects || []);

      setFullName(data.profile.full_name);
      setMajor(data.profile.major || '');
    } catch (err) {
      console.error('Error loading profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [targetId]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!isOwnProfile) return;
    setUpdating(true);
    try {
      const res = await axios.put('/api/users/profile', {
        fullName,
        major
      });
      setProfile(res.data);
      updateProfileState(res.data); // update global context
      alert(lang === 'vi' ? 'Cập nhật thông tin thành công!' : 'Profile updated successfully!');
    } catch (err) {
      alert(err.response?.data?.error || (lang === 'vi' ? 'Không thể cập nhật hồ sơ.' : 'Failed to update profile.'));
    } finally {
      setUpdating(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reject >2MB client-side for avatar
    if (file.size > 2 * 1024 * 1024) {
      alert(lang === 'vi' ? 'Ảnh đại diện không được vượt quá 2MB.' : 'Avatar size must not exceed 2MB.');
      return;
    }

    const fd = new FormData();
    fd.append('avatar', file);

    setUploadingAvatar(true);
    try {
      const res = await axios.post('/api/users/upload-avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(prev => prev ? { ...prev, avatar: res.data.avatarUrl } : null);
      if (currentUser) {
        updateProfileState({ ...currentUser, avatar: res.data.avatarUrl });
      }
      alert(lang === 'vi' ? 'Tải lên ảnh đại diện thành công!' : 'Avatar uploaded successfully!');
    } catch (err) {
      alert(err.response?.data?.error || (lang === 'vi' ? 'Không thể tải lên ảnh đại diện.' : 'Failed to upload avatar.'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadDoc = (docId) => {
    window.open(`/api/documents/${docId}/download`, '_blank');
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: 'var(--text-secondary)' }}>
        {lang === 'vi' ? 'Đang tải hồ sơ...' : 'Loading profile...'}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container main-content" style={{ marginTop: '100px', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem' }}>
          <h2>{lang === 'vi' ? 'Không tìm thấy hồ sơ' : 'Profile Not Found'}</h2>
          <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>{lang === 'vi' ? 'Tài khoản này không tồn tại hoặc đã bị xóa.' : 'This account does not exist or has been deleted.'}</p>
          <Link to="/" className="btn btn-primary">{lang === 'vi' ? 'Quay lại trang chủ' : 'Back to Home'}</Link>
        </div>
      </div>
    );
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="profile-container">
      {/* Inject Scoped Styles */}
      <style>{`
        .profile-container { max-width:1200px; margin:100px auto 40px; padding:0 1.5rem; display:flex; gap:2rem; align-items:flex-start; text-align: left; }
        .sidebar { flex:0 0 320px; background:var(--card-bg); border-radius:16px; border:1px solid var(--border-color); padding:2.5rem 2rem; text-align:center; }
        .avatar-wrap { position:relative; width:140px; height:140px; margin:0 auto 1.5rem; border-radius:50%; overflow:hidden; border:3px solid var(--accent); }
        .avatar-wrap img { width:100%; height:100%; object-fit:cover; }
        .avatar-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; flex-direction:column; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s; cursor:pointer; color:#fff; font-size:0.85rem; font-weight:500; }
        .avatar-wrap:hover .avatar-overlay { opacity:1; }
        .sidebar h2 { font-size:1.5rem; margin-bottom:0.25rem; color: var(--text-primary); }
        .email { color:var(--text-secondary); font-size:0.95rem; margin-bottom:1rem; }
        .stats-row { display:flex; justify-content:space-between; border-top:1px solid var(--border-color); padding-top:1.5rem; margin-top:1.5rem; }
        .stat-item { flex:1; display:flex; flex-direction:column; align-items:center; }
        .stat-value { font-size:1.25rem; font-weight:700; color: var(--text-primary); }
        .stat-label { font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; margin-top:4px; text-align:center; line-height: 1.3; }
        
        .tabs { display:flex; gap:1rem; border-bottom:1px solid var(--border-color); margin-bottom:2rem; overflow-x:auto; }
        .tab-btn { padding:1rem 1.5rem; font-weight:600; color:var(--text-secondary); border-bottom:2px solid transparent; transition:all 0.2s; white-space:nowrap; background: none; border: none; cursor: pointer; }
        .tab-btn:hover { color:var(--text-primary); }
        .tab-btn.active { color:var(--accent); border-bottom-color:var(--accent); }
        .tab-pane { display:none; animation:fadeIn 0.3s ease; }
        .tab-pane.active { display:block; }
        
        /* Inner list styles */
        .list-wrap { display: flex; flex-direction: column; gap: 1rem; }
        .list-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; }
        .profile-doc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
        
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @media (max-width:992px) {
          .profile-doc-grid { grid-template-columns: 1fr; }
        }
        @media (max-width:768px) {
          .profile-container { flex-direction:column; align-items: stretch; }
          .sidebar { flex:auto; width:100%; }
        }
      `}</style>

      {/* Left sidebar */}
      <aside className="sidebar">
        <div className="avatar-wrap">
          <img src={profile.avatar || '/uploads/avatar_default.png'} alt={profile.full_name} />
          {isOwnProfile && (
            <div className="avatar-overlay" onClick={triggerUpload}>
              <svg style={{ width: '16px', height: '16px', marginBottom: '4px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"></path>
              </svg>
              {lang === 'vi' ? 'Sửa' : 'Edit'}
            </div>
          )}
        </div>
        
        {isOwnProfile && (
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
            accept="image/*"
          />
        )}

        <h2>{profile.full_name}</h2>
        <p className="email">@{profile.username}</p>
        <div className="role-badge" style={{ marginBottom: '1rem', textTransform: 'capitalize' }}>
          {profile.role === 'admin' ? (lang === 'vi' ? 'Quản trị viên' : 'Admin') : profile.role === 'teacher' ? (lang === 'vi' ? 'Giáo viên' : 'Teacher') : (lang === 'vi' ? 'Sinh viên' : 'Student')}
        </div>
        {profile.major && (
          <p style={{ fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '1.25rem', fontWeight: 500 }}>{lang === 'vi' ? `Chuyên ngành: ${profile.major}` : `Major: ${profile.major}`}</p>
        )}
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lang === 'vi' ? `Tham gia từ: ${joinDate}` : `Joined: ${joinDate}`}</p>
        
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-value">{posts.length}</span>
            <span className="stat-label">{lang === 'vi' ? 'Bài viết' : 'Posts'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{questions.length}</span>
            <span className="stat-label">{lang === 'vi' ? 'Hỏi đáp' : 'Q&A'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{documents.length}</span>
            <span className="stat-label">{lang === 'vi' ? 'Tài liệu' : 'Docs'}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            {lang === 'vi' ? 'Hoạt động' : 'Activity'}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            {lang === 'vi' ? 'Tài liệu' : 'Documents'}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'qa' ? 'active' : ''}`}
            onClick={() => setActiveTab('qa')}
          >
            {lang === 'vi' ? 'Hỏi đáp' : 'Q&A'}
          </button>
          {isOwnProfile && (
            <button 
              className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              {lang === 'vi' ? 'Cài đặt' : 'Settings'}
            </button>
          )}
        </div>

        {/* Tab panes */}
        
        {/* Pane 1: Activity / Posts */}
        <div className={`tab-pane ${activeTab === 'activity' ? 'active' : ''}`}>
          {posts.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {lang === 'vi' ? 'Chưa có hoạt động bài đăng nào.' : 'No recent post activity.'}
            </div>
          ) : (
            <div className="list-wrap">
              {posts.map(p => (
                <div key={p.id} className="card list-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                    <span className="tag" style={{ border: 'none', padding: 0, background: 'none', color: 'var(--accent)', fontWeight: 600 }}>#{p.tag}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(p.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{p.content}</p>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                    <span>{p.likes} {lang === 'vi' ? 'lượt thích' : 'likes'}</span>
                    <span>{p.comments_count} {lang === 'vi' ? 'bình luận' : 'comments'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pane 2: Documents */}
        <div className={`tab-pane ${activeTab === 'docs' ? 'active' : ''}`}>
          {documents.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {lang === 'vi' ? 'Chưa có tài liệu chia sẻ nào.' : 'No shared documents.'}
            </div>
          ) : (
            <div className="profile-doc-grid">
              {documents.map(doc => (
                <div key={doc.id} className="card list-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{doc.title}</h4>
                    <span className="tag" style={{ fontSize: '0.7rem', textTransform: 'lowercase' }}>{doc.type}</span>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', marginTop: 'auto' }}>
                    <div>{lang === 'vi' ? 'Môn học: ' : 'Subject: '}<span style={{ color: 'var(--text-primary)' }}>{doc.subject}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                      <span>{lang === 'vi' ? 'Kích thước: ' : 'Size: '}{formatSize(doc.file_size)}</span>
                      <span>{doc.downloads} {lang === 'vi' ? 'tải xuống' : 'downloads'}</span>
                    </div>
                  </div>
                  
                  <button 
                    className="btn btn-outline" 
                    style={{ width: '100%', padding: '0.4rem' }}
                    onClick={() => handleDownloadDoc(doc.id)}
                  >
                    {lang === 'vi' ? 'Tải xuống' : 'Download'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pane 3: Q&A Questions */}
        <div className={`tab-pane ${activeTab === 'qa' ? 'active' : ''}`}>
          {questions.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {lang === 'vi' ? 'Chưa đặt câu hỏi thảo luận nào.' : 'No discussion questions posted.'}
            </div>
          ) : (
            <div className="list-wrap">
              {questions.map(q => (
                <div 
                  key={q.id} 
                  className="card list-card"
                  style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onClick={() => navigate(`/research/qa/${q.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <span className="tag">{q.subject}</span>
                      {q.hasAccepted > 0 && (
                        <span className="role-badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success-color)', fontSize: '0.7rem', padding: '1px 6px', margin: 0 }}>✓ {lang === 'vi' ? 'Đã giải quyết' : 'Resolved'}</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(q.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</span>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.5rem 0' }}>{q.title}</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {q.answer_count} {lang === 'vi' ? 'câu trả lời' : 'answers'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pane 4: Settings (Own Profile Only) */}
        {isOwnProfile && (
          <div className={`tab-pane ${activeTab === 'settings' ? 'active' : ''}`}>
            <div className="card">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                {lang === 'vi' ? 'Thiết lập tài khoản' : 'Account Settings'}
              </h3>
              
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label className="form-label">
                    <div>{lang === 'vi' ? 'Họ và tên' : 'Full Name'}</div>
                  </label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <div>{lang === 'vi' ? 'Chuyên ngành / Khoa' : 'Major / Department'}</div>
                  </label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder={lang === 'vi' ? 'Ví dụ: Khoa học máy tính, Kỹ thuật y sinh...' : 'E.g., Computer Science, Biomedical Engineering...'}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={updating}
                  >
                    {updating ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Lưu cài đặt' : 'Save Settings')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
