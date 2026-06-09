import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

const TAG_OPTIONS = [
  'General',
  'AI & Machine Learning',
  'Biomedical Ring',
  'Academic Writing',
  'Scholarships'
];

export default function Feed() {
  const { user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

  // State
  const [posts, setPosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [topMembers, setTopMembers] = useState([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postTag, setPostTag] = useState('General');
  const [creating, setCreating] = useState(false);

  // Fetch initial feed data
  const fetchPosts = async (pageNum = 1, append = false) => {
    setLoadingPosts(true);
    try {
      const res = await axios.get(`/api/posts?page=${pageNum}&limit=10`);
      if (res.data.length < 10) {
        setHasMore(false);
      }
      if (append) {
        setPosts(prev => [...prev, ...res.data]);
      } else {
        setPosts(res.data);
      }
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchWidgets = async () => {
    try {
      const trendRes = await axios.get('/api/posts/trending');
      setTrending(trendRes.data);

      const membersRes = await axios.get('/api/posts/top-members');
      setTopMembers(membersRes.data);
    } catch (err) {
      console.error('Error loading widget data:', err);
    }
  };

  useEffect(() => {
    fetchPosts(1, false);
    fetchWidgets();
  }, [user]);

  const loadMorePosts = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const handleLike = async (postId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const res = await axios.post(`/api/posts/${postId}/like`);
      setPosts(prev => 
        prev.map(p => p.id === postId ? { ...p, liked: res.data.liked ? 1 : 0, likes: res.data.likes } : p)
      );
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!postContent.trim()) return;

    setCreating(true);
    try {
      const res = await axios.post('/api/posts', {
        content: postContent,
        tag: postTag
      });
      
      setPosts(prev => [res.data, ...prev]);
      setShowModal(false);
      setPostContent('');
      setPostTag('General');
      fetchWidgets(); // refresh counts
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create post.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm(lang === 'vi' ? 'Bạn có chắc chắn muốn xóa bài đăng này?' : 'Are you sure you want to delete this post?')) return;
    try {
      await axios.delete(`/api/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
      fetchWidgets(); // refresh counts
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete post.');
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

  return (
    <div className="feed-container">
      {/* Inject Scoped Styles */}
      <style>{`
        .feed-container { display:grid; grid-template-columns:280px 1fr 300px; gap:1.5rem; max-width:1300px; margin:100px auto 40px; padding:0 1.5rem; align-items:start; }
        .left-sidebar { position:sticky; top:100px; }
        .mini-profile { text-align:center; }
        .quick-links { margin-top:2rem; display:flex; flex-direction:column; gap:0.5rem; }
        .quick-link { display:flex; align-items:center; gap:0.8rem; padding:0.8rem 1rem; border-radius:8px; font-weight:500; transition:background 0.2s; text-align: left; }
        .quick-link:hover, .quick-link.active { background:var(--bg-secondary); color:var(--accent); }
        .quick-link svg { width:20px; height:20px; }
        .main-feed { display:flex; flex-direction:column; gap:1rem; }
        .create-post-trigger { display:flex; gap:1rem; align-items:center; cursor:pointer; }
        .trigger-input { flex:1; background:var(--bg-secondary); border:1px solid var(--border-color); padding:0.8rem 1rem; border-radius:20px; color:var(--text-secondary); transition:border-color 0.2s; text-align: left; }
        .trigger-input:hover { border-color:var(--accent); }
        .post-card { animation:fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .post-header { display:flex; justify-content:space-between; margin-bottom:1rem; }
        .post-user { display:flex; gap:1rem; align-items:center; }
        .post-name { font-weight:600; font-size:1.05rem; display:flex; align-items:center; gap:0.5rem; }
        .post-meta { font-size:0.85rem; color:var(--text-secondary); margin-top:0.2rem; }
        .post-content { font-size:0.95rem; line-height:1.6; margin-bottom:1rem; word-break: break-word; text-align: left; }
        .post-stats { display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-secondary); border-bottom:1px solid var(--border-color); padding-bottom:0.8rem; margin-bottom:0.8rem; }
        .post-actions { display:flex; justify-content:space-between; }
        .action-btn { flex:1; display:flex; justify-content:center; align-items:center; gap:0.5rem; padding:0.6rem; border-radius:8px; font-weight:500; color:var(--text-secondary); transition:all 0.2s; background: none; border: none; }
        .action-btn:hover { background:var(--bg-secondary); color:var(--text-primary); }
        .action-btn.active { color:var(--accent); }
        .action-btn svg { width:20px; height:20px; }
        .right-sidebar { position:sticky; top:100px; }
        .widget-title { font-size:1.1rem; font-weight:700; margin-bottom:1.2rem; text-align: left; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
        .trend-item { display:flex; justify-content:space-between; padding:0.8rem 0; border-bottom:1px solid var(--border-color); cursor:pointer; text-align: left; }
        .trend-item:last-child { border-bottom:none; }
        .trend-name { font-weight:600; font-size:0.95rem; }
        .trend-posts { font-size:0.8rem; color:var(--text-secondary); }
        .trend-item:hover .trend-name { color:var(--accent); }
        .member-item { display:flex; gap:0.8rem; align-items:center; margin-bottom:1rem; cursor:pointer; text-align: left; }
        .member-name { font-weight:600; font-size:0.95rem; }
        .member-role { font-size:0.75rem; color:var(--text-secondary); }
        .member-item:hover .member-name { color:var(--accent); }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:2000; opacity:0; visibility:hidden; transition:0.3s; padding:1rem; }
        .modal-overlay.show { opacity:1; visibility:visible; }
        .modal-content { background:var(--card-bg); width:100%; max-width:500px; border-radius:12px; border:1px solid var(--border-color); overflow:hidden; transform:translateY(20px); transition:0.3s; }
        .modal-overlay.show .modal-content { transform:translateY(0); }
        .modal-header { padding:1.5rem; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; }
        .close-modal { font-size:1.5rem; color:var(--text-secondary); cursor:pointer; background: none; border: none; }
        .close-modal:hover { color:var(--text-primary); }
        .modal-body { padding:1.5rem; }
        .modal-textarea { width:100%; background:transparent; border:none; color:var(--text-primary); font-family:inherit; font-size:1.1rem; resize:none; min-height:120px; margin-bottom:1rem; }
        .modal-textarea:focus { outline:none; }
        .modal-options { display:flex; gap:1rem; margin-bottom:1rem; }
        .modal-select { flex:1; padding:0.6rem; border-radius:8px; background:var(--bg-secondary); border:1px solid var(--border-color); color:var(--text-primary); }
        .modal-footer { padding:1.5rem; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; }
        @media (max-width:1024px) { .feed-container { grid-template-columns:250px 1fr; } .right-sidebar { display:none; } }
        @media (max-width:768px) { .feed-container { grid-template-columns:1fr; } .left-sidebar { display:none; } }
      `}</style>

      {/* Left Sidebar */}
      <aside className="left-sidebar">
        {user ? (
          <div className="card mini-profile">
            <img 
              className="nav-avatar" 
              src={user.avatar || '/uploads/avatar_default.png'} 
              style={{ width: '80px', height: '80px', marginBottom: '1rem', objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--accent)', margin: '0 auto 1rem auto' }} 
              alt={user.full_name}
            />
            <h3>{user.full_name}</h3>
            <div className="role-badge" style={{ marginTop: '0.5rem', textTransform: 'capitalize' }}>{user.role}</div>
            <div className="quick-links">
              <Link to="/community" className="quick-link active">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.25 2.25 0 00-2.25-2.25H14"></path>
                </svg>
                {lang === 'vi' ? 'Bảng tin' : 'Feed'}
              </Link>
            </div>
          </div>
        ) : (
          <div className="card mini-profile">
            <h3>{lang === 'vi' ? 'Chào mừng bạn!' : 'Welcome!'}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{lang === 'vi' ? 'Đăng nhập để xem trang cá nhân nhanh.' : 'Log in to view your quick profile.'}</p>
            <div className="quick-links">
              <Link to="/community" className="quick-link active">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.25 2.25 0 00-2.25-2.25H14"></path>
                </svg>
                {lang === 'vi' ? 'Bảng tin' : 'Feed'}
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* Main Feed */}
      <main className="main-feed">
        {/* Guest banner (shown when not logged in) */}
        {!user && (
          <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              {lang === 'vi' ? 'Đăng nhập để tham gia thảo luận' : 'Log in to join the discussion'}
            </span>
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>{lang === 'vi' ? 'Đăng nhập' : 'Log In'}</Link>
          </div>
        )}

        {/* Create post trigger (logged-in only) */}
        {user && (
          <div className="card create-post-trigger" onClick={() => setShowModal(true)}>
            <img 
              className="nav-avatar" 
              src={user.avatar || '/uploads/avatar_default.png'} 
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
              alt={user.full_name}
            />
            <div className="trigger-input">
              {lang === 'vi' ? 'Bạn đang nghĩ gì?' : "What's on your mind?"}
            </div>
          </div>
        )}

        {/* Post cards */}
        {posts.length === 0 && !loadingPosts ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {lang === 'vi' ? 'Chưa có bài đăng nào. Hãy là người đầu tiên chia sẻ!' : 'No posts yet. Be the first to share!'}
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="card post-card visible">
              <div className="post-header">
                <div className="post-user">
                  <img 
                    src={post.avatar || '/uploads/avatar_default.png'} 
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
                    alt={post.full_name}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <div className="post-name">
                      {post.full_name} <span className="tag" style={{ fontSize: '0.75rem' }}>@{post.username}</span>
                      {post.role === 'teacher' && <span className="role-badge" style={{ fontSize: '0.65rem', padding: '1px 6px', margin: 0 }}>Advisor</span>}
                    </div>
                    <div className="post-meta">
                      {timeAgo(post.created_at)} · <span className="tag" style={{ border: 'none', padding: 0, background: 'none' }}>{post.tag}</span>
                    </div>
                  </div>
                </div>
                {/* delete button (owner/admin only) */}
                {user && (post.user_id === user.id || user.role === 'admin') && (
                  <button 
                    onClick={() => handleDeletePost(post.id)}
                    style={{ color: 'var(--error-color)', fontSize: '1.2rem', padding: '0.2rem' }}
                    title="Delete Post"
                  >
                    &times;
                  </button>
                )}
              </div>
              
              <p className="post-content">{post.content}</p>
              
              <div className="post-stats">
                <span>{post.likes} {lang === 'vi' ? 'lượt thích' : 'likes'}</span>
                <span>{post.comments_count} {lang === 'vi' ? 'bình luận' : 'comments'}</span>
              </div>
              
              <div className="post-actions">
                <button 
                  className={`action-btn ${post.liked === 1 ? 'active' : ''}`}
                  onClick={() => handleLike(post.id)}
                >
                  <svg fill={post.liked === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                  </svg>
                  {lang === 'vi' ? 'Thích' : 'Like'}
                </button>
                <button className="action-btn" onClick={() => user ? alert(lang === 'vi' ? 'Chức năng bình luận sẽ sớm ra mắt!' : 'Comments section coming soon!') : navigate('/login')}>
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                  </svg>
                  {lang === 'vi' ? 'Bình luận' : 'Comment'}
                </button>
                <button className="action-btn" onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + `/post/${post.id}`);
                  alert(lang === 'vi' ? 'Đã sao chép liên kết vào bộ nhớ tạm!' : 'Link copied to clipboard!');
                }}>
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l4.636-2.318m0 4.318l-4.636-2.318m0 0a3 3 0 100-4.243 3 3 0 000 4.243zm7.952 4.244a3 3 0 11-6 0 3 3 0 016 0zM4.136 8.742a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  {lang === 'vi' ? 'Chia sẻ' : 'Share'}
                </button>
              </div>
            </div>
          ))
        )}

        {hasMore && posts.length > 0 && (
          <div className="load-more">
            <button className="btn btn-primary" onClick={loadMorePosts} disabled={loadingPosts}>
              {loadingPosts ? (lang === 'vi' ? 'Đang tải...' : 'Loading...') : (lang === 'vi' ? 'Xem thêm' : 'Load More')}
            </button>
          </div>
        )}
      </main>

      {/* Right Sidebar */}
      <aside className="right-sidebar">
        {/* Trending tags */}
        <div className="card">
          <div className="widget-title">{lang === 'vi' ? 'Chủ đề nổi bật' : 'Trending'}</div>
          {trending.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{lang === 'vi' ? 'Chưa có xu hướng nào.' : 'No trending tags yet.'}</div>
          ) : (
            trending.map((t, index) => (
              <div key={index} className="trend-item">
                <div>
                  <div className="trend-name">#{t.tag}</div>
                  <div className="trend-posts">{t.posts_count} {lang === 'vi' ? 'bài đăng' : 'posts'}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Top active members */}
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="widget-title">{lang === 'vi' ? 'Thành viên nổi bật' : 'Top Members'}</div>
          {topMembers.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{lang === 'vi' ? 'Chưa có thành viên nào.' : 'No active members yet.'}</div>
          ) : (
            topMembers.map(m => (
              <div key={m.id} className="member-item" onClick={() => navigate(`/profile/${m.id}`)}>
                <img 
                  src={m.avatar || '/uploads/avatar_default.png'} 
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} 
                  alt={m.full_name}
                />
                <div>
                  <div className="member-name">{m.full_name}</div>
                  <div className="member-role" style={{ textTransform: 'capitalize' }}>
                    {m.role === 'admin' ? (lang === 'vi' ? 'Quản trị' : 'Admin') : m.role === 'teacher' ? (lang === 'vi' ? 'Giảng viên' : 'Advisor') : (lang === 'vi' ? 'Sinh viên' : 'Student')} &bull; {m.posts_count || 1} {lang === 'vi' ? 'bài đăng' : 'posts'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Post modal */}
      <div className={`modal-overlay ${showModal ? 'show' : ''}`} onClick={() => setShowModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{lang === 'vi' ? 'Tạo bài đăng' : 'Create Post'}</h2>
            <button className="close-modal" onClick={() => setShowModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleCreatePost}>
            <div className="modal-body">
              <textarea 
                className="modal-textarea" 
                placeholder={lang === 'vi' ? 'Chia sẻ suy nghĩ của bạn...' : 'Share your thoughts...'}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                required
              />
              <div className="modal-options">
                <select 
                  className="modal-select"
                  value={postTag}
                  onChange={(e) => setPostTag(e.target.value)}
                >
                  {TAG_OPTIONS.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? (lang === 'vi' ? 'Đang đăng...' : 'Posting...') : (lang === 'vi' ? 'Đăng' : 'Post')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
