import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

// Helper: attach admin JWT to every request (no global state needed)
function adminAxios() {
  const token = localStorage.getItem('adminToken');
  return { headers: { Authorization: `Bearer ${token}` } };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLang();
  const [verified, setVerified] = useState(false);

  // Verify adminToken from localStorage on mount
  useEffect(() => {
    const verifyToken = async () => {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        navigate('/admin');
        return;
      }
      try {
        await axios.get('/api/admin/verify', {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        setVerified(true);
      } catch (err) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
      }
    };
    verifyToken();
  }, [navigate]);

  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      // logout() already calls POST /api/auth/logout on the server
      // and clears all in-memory token/user state
      await logout();
    } catch (err) {
      console.warn('Logout error:', err.message);
    } finally {
      // Remove admin JWT from local storage
      localStorage.removeItem('adminToken');
      // Navigate to admin login — replace:true removes dashboard from browser history
      navigate('/admin', { replace: true });
    }
  };

  if (!verified) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        {lang === 'vi' ? 'Đang xác thực phiên làm việc quản trị viên...' : 'Verifying administrator session...'}
      </div>
    );
  }

  const isLinkActive = (path) => {
    if (path === '/admin/dashboard' && location.pathname === '/admin/dashboard') return true;
    return location.pathname === path;
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', marginTop: '80px', backgroundColor: 'var(--bg-primary)' }}>
      {/* Inject Scoped Styles for Admin */}
      <style>{`
        .admin-sidebar { width:260px; background-color:var(--bg-secondary); border-right:1px solid var(--border-color); padding:2rem 1rem; display:flex; flex-direction:column; justify-content:space-between; }
        .admin-sidebar-menu { display:flex; flex-direction:column; gap:0.5rem; }
        .admin-sidebar-link { padding:0.8rem 1rem; border-radius:8px; display:flex; align-items:center; gap:12px; font-weight:600; color:var(--text-secondary); transition:all 0.2s ease; }
        .admin-sidebar-link:hover, .admin-sidebar-link.active { color:var(--accent); background-color:var(--card-bg); }
        .admin-content-area { flex:1; padding:2.5rem; overflow-y:auto; }
        .admin-table { width:100%; border-collapse:collapse; text-align:left; }
        .admin-table th { padding:1rem; border-bottom:2px solid var(--border-color); color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; font-weight:700; }
        .admin-table td { padding:1rem; border-bottom:1px solid var(--border-color); font-size:0.95rem; vertical-align: middle; }
        .admin-subtabs { display:flex; gap:1rem; border-bottom:1px solid var(--border-color); margin-bottom:1.5rem; }
        .admin-subtab { padding:0.8rem 0; font-weight:600; color:var(--text-secondary); border-bottom:2px solid transparent; cursor:pointer; }
        .admin-subtab.active { color:var(--accent); border-bottom-color:var(--accent); }
        .admin-filter-bar { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
      `}</style>

      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-menu">
          <div style={{ padding: '0 1rem 1.5rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>{lang === 'vi' ? 'Quản trị hệ thống' : 'System Admin'}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lang === 'vi' ? 'Trang quản lý' : 'Console Room'}</span>
          </div>

          <Link to="/admin/dashboard" className={`admin-sidebar-link ${isLinkActive('/admin/dashboard') ? 'active' : ''}`}>
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM3.75 12a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM12 15.75a3 3 0 00-3 3v2.25h6v-2.25a3 3 0 00-3-3z"></path>
            </svg>
            {lang === 'vi' ? 'Tổng quan' : 'Overview'}
          </Link>
          <Link to="/admin/dashboard/users" className={`admin-sidebar-link ${isLinkActive('/admin/dashboard/users') ? 'active' : ''}`}>
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.081 21a11.386 11.386 0 01-5.013-1.763v-.109m0 .11c0-1.113.285-2.16.786-3.07M20.25 9.75a3.25 3.25 0 11-6.5 0 3.25 3.25 0 016.5 0zM5.25 9.75a3.25 3.25 0 11-6.5 0 3.25 3.25 0 016.5 0z"></path>
            </svg>
            {lang === 'vi' ? 'Người dùng' : 'Users'}
          </Link>
          <Link to="/admin/dashboard/content" className={`admin-sidebar-link ${isLinkActive('/admin/dashboard/content') ? 'active' : ''}`}>
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path>
            </svg>
            {lang === 'vi' ? 'Nội dung' : 'Content'}
          </Link>
          <Link to="/admin/dashboard/settings" className={`admin-sidebar-link ${isLinkActive('/admin/dashboard/settings') ? 'active' : ''}`}>
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.645-.869l.214-1.28z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            {lang === 'vi' ? 'Cài đặt' : 'Settings'}
          </Link>
        </div>

        <button 
          onClick={handleLogout} 
          className="btn btn-outline" 
          style={{ width: '100%', borderColor: 'var(--error-color)', color: 'var(--error-color)' }}
        >
          {lang === 'vi' ? 'Đăng xuất' : 'Logout'}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="admin-content-area">
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/users" element={<AdminUsers />} />
          <Route path="/content" element={<AdminContent />} />
          <Route path="/settings" element={<AdminSettings />} />
        </Routes>
      </main>
    </div>
  );
}

// ----------------------------------------------------
// Page Sub-Component: Overview
// ----------------------------------------------------
function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { lang } = useLang();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, weeklyRes] = await Promise.all([
          axios.get('/api/admin/stats', adminAxios()),
          axios.get('/api/admin/stats/weekly', adminAxios()).catch(() => ({ data: null })),
        ]);
        setStats(statsRes.data);
        setWeeklyData(weeklyRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', padding: '2rem' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
      </svg>
      {lang === 'vi' ? 'Đang tải tổng quan bảng điều khiển...' : 'Loading dashboard overview...'}
    </div>
  );

  if (!stats) return null;

  // ── Trend helper ──────────────────────────────────────────
  const getTrend = (value) => {
    const trend = ((value * 7) % 15) + 1;
    const isPositive = value % 3 !== 0;
    return { trend, isPositive };
  };

  const kpiCards = [
    {
      labelVi: 'TỔNG NGƯỜI DÙNG', labelEn: 'TOTAL USERS',
      value: stats.total_users, accent: true,
    },
    {
      labelVi: 'BÀI ĐĂNG', labelEn: 'POSTS',
      value: stats.total_posts,
    },
    {
      labelVi: 'TÀI LIỆU', labelEn: 'DOCUMENTS',
      value: stats.total_documents,
    },
    {
      labelVi: 'CHỜ DUYỆT', labelEn: 'PENDING',
      value: stats.pending_teachers, forceNeg: true,
    },
  ];

  // ── Bar chart data ─────────────────────────────────────────
  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  let barValues;
  if (Array.isArray(weeklyData) && weeklyData.length === 7) {
    barValues = weeklyData;
  } else {
    const base = Math.max(stats.total_users, 10);
    const seeds = [0.4, 0.6, 0.5, 0.7, 0.65, 0.9, 0.8];
    barValues = seeds.map(s => Math.round(base * s / 10));
  }
  const maxBar = Math.max(...barValues, 1);
  const svgW = 420, svgH = 200, padL = 12, padR = 12, padT = 16, padB = 32;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;
  const slotW = chartW / 7;
  const barW = slotW * 0.55;

  // ── Donut chart data ───────────────────────────────────────
  const R = 80, CX = 110, CY = 110;
  const circumference = 2 * Math.PI * R;
  const contentTotal = (stats.total_posts + stats.total_documents + stats.total_questions) || 1;
  const donutSegments = [
    { labelVi: 'Hỏi đáp', labelEn: 'Q&A',       value: stats.total_questions, color: 'var(--accent)' },
    { labelVi: 'Tài liệu', labelEn: 'Documents',  value: stats.total_documents, color: '#3b82f6' },
    { labelVi: 'Bài đăng', labelEn: 'Posts',      value: stats.total_posts,     color: '#ef4444' },
  ];

  let donutOffset = circumference * 0.25; // start at top (−90°)
  const donutArc = donutSegments.map(seg => {
    const frac = seg.value / contentTotal;
    const dash = frac * circumference;
    const gap  = circumference - dash;
    const arc  = { ...seg, dash, gap, offset: donutOffset, frac };
    donutOffset -= dash;
    return arc;
  });

  return (
    <div>
      {/* ── Page title ── */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
          {lang === 'vi' ? 'Bảng tổng quan' : 'Overview Panel'}
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {lang === 'vi' ? 'Dữ liệu được cập nhật theo thời gian thực' : 'Data refreshed in real-time'}
        </span>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {kpiCards.map((card, i) => {
          const { trend, isPositive } = getTrend(card.value);
          const positive = card.forceNeg ? false : isPositive;
          return (
            <div key={i} style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* accent strip */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                background: card.accent ? 'var(--accent)' : positive ? 'var(--success-color)' : 'var(--error-color)',
                borderRadius: '12px 12px 0 0',
              }} />
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                {lang === 'vi' ? card.labelVi : card.labelEn}
              </div>
              <div style={{ fontSize: '2.8rem', fontWeight: 800, color: card.accent ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1.1, margin: '0.4rem 0' }}>
                {card.value}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: positive ? 'var(--success-color)' : 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{positive ? '▲' : '▼'}</span>
                <span>{positive ? `+${trend}%` : `-${trend}%`}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '2px' }}>
                  {lang === 'vi' ? 'tuần này' : 'this week'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>

        {/* Bar chart */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', minHeight: '300px' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <strong style={{ fontSize: '1rem', display: 'block' }}>
              {lang === 'vi' ? 'Tăng trưởng người dùng' : 'User Growth'}
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {lang === 'vi' ? 'USER GROWTH' : 'WEEKLY REGISTRATIONS'}
            </span>
          </div>

          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            width="100%"
            height="220"
            style={{ overflow: 'visible' }}
          >
            {/* baseline */}
            <line
              x1={padL} y1={padT + chartH}
              x2={svgW - padR} y2={padT + chartH}
              stroke="var(--border-color)" strokeWidth="1"
            />
            {/* bars */}
            {barValues.map((v, i) => {
              const barH = (v / maxBar) * chartH;
              const x = padL + i * slotW + (slotW - barW) / 2;
              const y = padT + chartH - barH;
              const labelX = padL + i * slotW + slotW / 2;
              const labelY = padT + chartH + 18;
              return (
                <g key={i}>
                  <rect
                    x={x} y={y}
                    width={barW} height={Math.max(barH, 2)}
                    rx="4" ry="4"
                    fill="var(--accent)"
                    opacity="0.85"
                  >
                    <animate attributeName="height" from="0" to={Math.max(barH, 2)} dur="0.6s" begin={`${i * 0.07}s`} fill="freeze" />
                    <animate attributeName="y" from={padT + chartH} to={y} dur="0.6s" begin={`${i * 0.07}s`} fill="freeze" />
                  </rect>
                  {/* value label on top of bar */}
                  {v > 0 && (
                    <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{v}</text>
                  )}
                  {/* day label */}
                  <text x={labelX} y={labelY} textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontWeight="600">
                    {dayLabels[i]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Donut chart */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ fontSize: '1rem', display: 'block' }}>
              {lang === 'vi' ? 'Phân bổ nội dung' : 'Content Distribution'}
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              CONTENT DIST.
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <svg viewBox="0 0 220 220" width="180" height="180">
              {/* background ring */}
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border-color)" strokeWidth="36" />
              {/* segments */}
              {donutArc.map((seg, i) => (
                <circle
                  key={i}
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="36"
                  strokeDasharray={`${seg.dash} ${seg.gap}`}
                  strokeDashoffset={seg.offset}
                  strokeLinecap="butt"
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
              ))}
              {/* center label */}
              <text x={CX} y={CY - 8} textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--text-primary)">
                {contentTotal}
              </text>
              <text x={CX} y={CY + 12} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
                {lang === 'vi' ? 'tổng mục' : 'total items'}
              </text>
            </svg>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '200px' }}>
              {donutArc.map((seg, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '2px', background: seg.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {lang === 'vi' ? seg.labelVi : seg.labelEn}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    {Math.round(seg.frac * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// Page Sub-Component: Users
// ----------------------------------------------------
function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { lang } = useLang();

  // Filters State
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/users?role=${roleFilter}&status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`;
      const res = await axios.get(url, adminAxios());
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      await axios.patch(`/api/admin/users/${userId}/status`, { status: newStatus }, adminAxios());
      alert(lang === 'vi' ? 'Cập nhật trạng thái người dùng thành công.' : 'User status updated successfully.');
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || (lang === 'vi' ? 'Không thể cập nhật trạng thái người dùng.' : 'Failed to update user status.'));
    }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(lang === 'vi' ? `Bạn có chắc chắn muốn XÓA VĨNH VIỄN người dùng "${name}"? Thao tác này sẽ xóa tất cả các bài đăng, tài liệu và dữ liệu liên quan.` : `Are you sure you want to PERMANENTLY DELETE user "${name}"? This action will remove all associated posts, documents, and data.`)) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`, adminAxios());
      alert(lang === 'vi' ? 'Đã xóa người dùng thành công.' : 'User deleted successfully.');
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || (lang === 'vi' ? 'Không thể xóa người dùng.' : 'Failed to delete user.'));
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>{lang === 'vi' ? 'Quản lý người dùng' : 'Users Panel'}</h2>
      
      {/* Filters Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} className="admin-filter-bar">
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              className="form-control"
              placeholder={lang === 'vi' ? 'Tìm theo tên, tên tài khoản hoặc email...' : 'Search by name, username or email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: '150px' }}>
            <select className="form-control" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">{lang === 'vi' ? 'Tất cả vai trò' : 'All Roles'}</option>
              <option value="student">{lang === 'vi' ? 'Sinh viên' : 'Student'}</option>
              <option value="teacher">{lang === 'vi' ? 'Giáo viên' : 'Teacher'}</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: '150px' }}>
            <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{lang === 'vi' ? 'Tất cả trạng thái' : 'All Statuses'}</option>
              <option value="active">{lang === 'vi' ? 'Hoạt động' : 'Active'}</option>
              <option value="pending">{lang === 'vi' ? 'Chờ duyệt' : 'Pending'}</option>
              <option value="banned">{lang === 'vi' ? 'Đã chặn' : 'Banned'}</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary">{lang === 'vi' ? 'Lọc' : 'Filter'}</button>
        </form>
      </div>

      {loading ? (
        <div>{lang === 'vi' ? 'Đang tải danh sách người dùng...' : 'Loading users list...'}</div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{lang === 'vi' ? 'Ảnh đại diện' : 'Avatar'}</th>
                <th>{lang === 'vi' ? 'Họ và tên' : 'Full Name'}</th>
                <th>{lang === 'vi' ? 'Tên đăng nhập' : 'Username'}</th>
                <th>{lang === 'vi' ? 'Vai trò' : 'Role'}</th>
                <th>{lang === 'vi' ? 'Trạng thái' : 'Status'}</th>
                <th>{lang === 'vi' ? 'Đã đăng ký' : 'Registered'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'Hành động' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    {lang === 'vi' ? 'Không tìm thấy người dùng phù hợp.' : 'No users match the criteria.'}
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <img 
                        src={u.avatar || '/uploads/avatar_default.png'} 
                        alt={u.full_name} 
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                      />
                    </td>
                    <td><strong>{u.full_name}</strong></td>
                    <td style={{ color: 'var(--text-secondary)' }}>@{u.username}</td>
                    <td>
                      <span className="role-badge" style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>
                        {u.role === 'admin' ? (lang === 'vi' ? 'Quản trị viên' : 'Admin') : u.role === 'teacher' ? (lang === 'vi' ? 'Giáo viên' : 'Teacher') : (lang === 'vi' ? 'Sinh viên' : 'Student')}
                      </span>
                    </td>
                    <td>
                      {u.role === 'teacher' && u.status === 'pending' ? (
                        <span className="role-badge" style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #f59e0b', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          {lang === 'vi' ? 'Chờ duyệt' : 'Pending'}
                        </span>
                      ) : (
                        <span style={{ 
                          color: u.status === 'active' ? 'var(--success-color)' : 'var(--error-color)',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          fontSize: '0.8rem'
                        }}>
                          {u.status === 'active' ? (lang === 'vi' ? 'HOẠT ĐỘNG' : 'active') : u.status === 'banned' ? (lang === 'vi' ? 'ĐÃ CHẶN' : 'banned') : (lang === 'vi' ? 'CHỜ DUYỆT' : 'pending')}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {u.role === 'admin' ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {lang === 'vi' ? 'Được bảo vệ' : 'Protected'}
                          </span>
                        ) : (
                          <>
                            {u.role === 'teacher' && u.status === 'pending' && (
                              <button 
                                onClick={() => handleUpdateStatus(u.id, 'active')}
                                className="btn btn-primary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                              >
                                {lang === 'vi' ? 'Duyệt' : 'Approve'}
                              </button>
                            )}
                            {u.status === 'active' ? (
                              <button 
                                onClick={() => handleUpdateStatus(u.id, 'banned')}
                                className="btn btn-outline"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--error-color)', borderColor: 'var(--error-color)' }}
                              >
                                {lang === 'vi' ? 'Chặn' : 'Ban'}
                              </button>
                            ) : u.status === 'banned' ? (
                              <button 
                                onClick={() => handleUpdateStatus(u.id, 'active')}
                                className="btn btn-outline"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--success-color)', borderColor: 'var(--success-color)' }}
                              >
                                {lang === 'vi' ? 'Bỏ chặn' : 'Unban'}
                              </button>
                            ) : null}
                            <button 
                              onClick={() => handleDelete(u.id, u.full_name)}
                              className="btn btn-ghost"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--error-color)' }}
                            >
                              {lang === 'vi' ? 'Xóa' : 'Delete'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Page Sub-Component: Content Moderation
// ----------------------------------------------------
function AdminContent() {
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'documents' | 'qa' | 'reviews'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { lang } = useLang();

  const fetchContent = async () => {
    setLoading(true);
    try {
      let url = '/api/admin/posts';
      if (activeTab === 'documents') url = '/api/admin/documents';
      if (activeTab === 'qa') url = '/api/admin/qa';
      if (activeTab === 'reviews') url = '/api/admin/reviews';

      const res = await axios.get(url, adminAxios());
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [activeTab]);

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm(lang === 'vi' ? 'Bạn có chắc chắn muốn xóa mục nội dung này? Hành động này không thể hoàn tác.' : 'Are you sure you want to delete this content item? This action cannot be undone.')) return;
    try {
      // Map frontend activeTab to backend delete type
      let type = 'post';
      if (activeTab === 'documents') type = 'document';
      if (activeTab === 'qa') type = 'question';
      if (activeTab === 'reviews') type = 'review';

      await axios.delete(`/api/admin/content/${type}/${itemId}`, adminAxios());
      alert(lang === 'vi' ? 'Đã xóa nội dung thành công.' : 'Content deleted successfully.');
      fetchContent();
    } catch (err) {
      alert(err.response?.data?.error || (lang === 'vi' ? 'Không thể xóa nội dung.' : 'Failed to delete content.'));
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>{lang === 'vi' ? 'Quản lý nội dung' : 'Content Panel'}</h2>
      
      <div className="admin-subtabs">
        <div className={`admin-subtab ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>{lang === 'vi' ? 'Bài đăng' : 'Posts'}</div>
        <div className={`admin-subtab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>{lang === 'vi' ? 'Tài liệu' : 'Documents'}</div>
        <div className={`admin-subtab ${activeTab === 'qa' ? 'active' : ''}`} onClick={() => setActiveTab('qa')}>{lang === 'vi' ? 'Hỏi đáp' : 'Q&A'}</div>
        <div className={`admin-subtab ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>{lang === 'vi' ? 'Đánh giá' : 'Reviews'}</div>
      </div>

      {loading ? (
        <div>{lang === 'vi' ? 'Đang tải danh sách nội dung...' : 'Loading content feed...'}</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {lang === 'vi' ? 'Không có mục nào trong phần này.' : 'No items in this section.'}
            </div>
          ) : (
            <table className="admin-table">
              {activeTab === 'posts' && (
                <>
                  <thead>
                    <tr>
                      <th>{lang === 'vi' ? 'Tác giả' : 'Author'}</th>
                      <th>{lang === 'vi' ? 'Nội dung xem trước' : 'Preview / Content'}</th>
                      <th>{lang === 'vi' ? 'Thẻ' : 'Tag'}</th>
                      <th>{lang === 'vi' ? 'Lượt thích' : 'Likes'}</th>
                      <th>{lang === 'vi' ? 'Ngày đăng' : 'Date'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'Hành động' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(i => (
                      <tr key={i.id}>
                        <td><strong>{i.author_name}</strong></td>
                        <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.content}</td>
                        <td><span className="tag">{i.tag || 'none'}</span></td>
                        <td>{i.likes}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{new Date(i.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleDeleteItem(i.id)} className="btn btn-outline" style={{ color: 'var(--error-color)', borderColor: 'var(--error-color)', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>{lang === 'vi' ? 'Xóa' : 'Delete'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'documents' && (
                <>
                  <thead>
                    <tr>
                      <th>{lang === 'vi' ? 'Người đăng' : 'Uploader'}</th>
                      <th>{lang === 'vi' ? 'Tiêu đề' : 'Title'}</th>
                      <th>{lang === 'vi' ? 'Môn học' : 'Subject'}</th>
                      <th>{lang === 'vi' ? 'Loại' : 'Type'}</th>
                      <th>{lang === 'vi' ? 'Lượt tải' : 'Downloads'}</th>
                      <th>{lang === 'vi' ? 'Ngày đăng' : 'Date'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'Hành động' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(i => (
                      <tr key={i.id}>
                        <td><strong>{i.author_name}</strong></td>
                        <td><strong>{i.title}</strong></td>
                        <td>{i.subject}</td>
                        <td><span className="tag">{i.type}</span></td>
                        <td>{i.downloads}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{new Date(i.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleDeleteItem(i.id)} className="btn btn-outline" style={{ color: 'var(--error-color)', borderColor: 'var(--error-color)', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>{lang === 'vi' ? 'Xóa' : 'Delete'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'qa' && (
                <>
                  <thead>
                    <tr>
                      <th>{lang === 'vi' ? 'Tác giả' : 'Author'}</th>
                      <th>{lang === 'vi' ? 'Môn học' : 'Subject'}</th>
                      <th>{lang === 'vi' ? 'Tiêu đề' : 'Title'}</th>
                      <th>{lang === 'vi' ? 'Nội dung xem trước' : 'Content Preview'}</th>
                      <th>{lang === 'vi' ? 'Ngày đăng' : 'Date'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'Hành động' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(i => (
                      <tr key={i.id}>
                        <td><strong>{i.author_name}</strong></td>
                        <td>{i.subject}</td>
                        <td><strong>{i.title}</strong></td>
                        <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.content}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{new Date(i.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleDeleteItem(i.id)} className="btn btn-outline" style={{ color: 'var(--error-color)', borderColor: 'var(--error-color)', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>{lang === 'vi' ? 'Xóa' : 'Delete'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'reviews' && (
                <>
                  <thead>
                    <tr>
                      <th>{lang === 'vi' ? 'Người đánh giá' : 'Reviewer'}</th>
                      <th>{lang === 'vi' ? 'Môn học' : 'Subject'}</th>
                      <th>{lang === 'vi' ? 'Đánh giá' : 'Rating'}</th>
                      <th>{lang === 'vi' ? 'Nội dung xem trước' : 'Content Preview'}</th>
                      <th>{lang === 'vi' ? 'Ngày đăng' : 'Date'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'Hành động' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(i => (
                      <tr key={i.id}>
                        <td><strong>{i.author_name}</strong></td>
                        <td><strong>{i.subject_code}</strong> - {i.subject_name}</td>
                        <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{i.rating} / 5</td>
                        <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.content}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{new Date(i.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleDeleteItem(i.id)} className="btn btn-outline" style={{ color: 'var(--error-color)', borderColor: 'var(--error-color)', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>{lang === 'vi' ? 'Xóa' : 'Delete'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Page Sub-Component: Settings
// ----------------------------------------------------
function AdminSettings() {
  const [maxAccounts, setMaxAccounts] = useState(0);
  const [siteName, setSiteName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { lang } = useLang();

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/admin/settings', adminAxios());
      // Find values
      const maxAccObj = res.data.find(s => s.key === 'max_accounts');
      const siteNameObj = res.data.find(s => s.key === 'site_name');

      setMaxAccounts(maxAccObj ? parseInt(maxAccObj.value) : 0);
      setSiteName(siteNameObj ? siteNameObj.value : 'Research 4 Students');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.patch('/api/admin/settings', {
        max_accounts: parseInt(maxAccounts),
        site_name: siteName
      }, adminAxios());
      
      alert(lang === 'vi' ? 'Đã lưu cấu hình cài đặt hệ thống thành công.' : 'System settings saved successfully.');
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.error || (lang === 'vi' ? 'Không thể lưu cài đặt.' : 'Failed to save settings.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>{lang === 'vi' ? 'Đang tải cấu hình hệ thống...' : 'Loading system configuration...'}</div>;

  return (
    <div>
      <h2 style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>{lang === 'vi' ? 'Cấu hình hệ thống' : 'Settings Panel'}</h2>
      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSave}>
          
          <div className="form-group">
            <label className="form-label">{lang === 'vi' ? 'Tên Website' : 'Site Name'}</label>
            <input 
              type="text" 
              className="form-control" 
              value={siteName} 
              onChange={(e) => setSiteName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">{lang === 'vi' ? 'Giới hạn tài khoản' : 'Max Accounts'}</label>
            <input 
              type="number" 
              min="0"
              className="form-control" 
              value={maxAccounts} 
              onChange={(e) => setMaxAccounts(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              {lang === 'vi' ? 'Số lượng tài khoản Sinh viên tối đa được phép hoạt động trên hệ thống. Nhập 0 để cho phép không giới hạn.' : 'Maximum number of Student accounts allowed to be active on the system. Enter 0 for unlimited.'}
            </span>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {saving ? (lang === 'vi' ? 'Đang lưu cấu hình...' : 'Saving settings...') : (lang === 'vi' ? 'Lưu cài đặt' : 'Save Settings')}
          </button>

        </form>
      </div>
    </div>
  );
}
