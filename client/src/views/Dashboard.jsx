import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { lang } = useLang();
  
  const [projects, setProjects] = useState([]);
  const [applications, setApplications] = useState([]);
  const [allPendingApps, setAllPendingApps] = useState([]); // for advisor
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profileRes = await axios.get(`/api/users/profile/${user.id}`);
      
      if (user.role === 'advisor' || user.role === 'teacher') {
        setProjects(profileRes.data.projects || []);
        
        // Advisor: fetch applications for ALL projects they own
        const advisorProjects = profileRes.data.projects || [];
        const pendingAppsList = [];
        
        for (const proj of advisorProjects) {
          const appRes = await axios.get(`/api/projects/${proj.id}/applications`);
          const pending = appRes.data.filter(a => a.status === 'pending');
          // Add project details to application
          pending.forEach(app => {
            app.project_title = proj.title;
            pendingAppsList.push(app);
          });
        }
        setAllPendingApps(pendingAppsList);

      } else if (user.role === 'student') {
        setProjects(profileRes.data.projects || []);
        setApplications(profileRes.data.applications || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleApplicationDecision = async (appId, decision) => {
    if (!window.confirm(lang === 'vi' ? `Bạn có chắc chắn muốn ${decision === 'approved' ? 'chấp nhận' : 'từ chối'} đơn ứng tuyển này?` : `Are you sure you want to ${decision} this application?`)) return;

    try {
      await axios.put(`/api/applications/${appId}`, { status: decision });
      alert(lang === 'vi' ? `Xử lý đơn ứng tuyển thành công.` : `Application ${decision} successfully.`);
      fetchDashboardData(); // reload
    } catch (err) {
      alert(err.response?.data?.error || (lang === 'vi' ? 'Không thể thực hiện hành động này.' : 'Failed to handle decision.'));
    }
  };

  if (loading) {
    return <div className="container main-content" style={{ textAlign: 'center', padding: '5rem 0' }}>{lang === 'vi' ? 'Đang tải bảng điều khiển...' : 'Loading your dashboard...'}</div>;
  }

  return (
    <div className="container main-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>{lang === 'vi' ? 'Bảng điều khiển' : 'Dashboard'}</h1>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {lang === 'vi' ? `Chào mừng bạn quay lại, ${user?.full_name} (${user?.role === 'student' ? 'Sinh viên' : user?.role === 'admin' ? 'Quản trị viên' : 'Giáo viên'})` : `Welcome back, ${user?.full_name} (${user?.role})`}
          </span>
        </div>
        {(user?.role === 'advisor' || user?.role === 'teacher') && (
          <Link to="/create-project" className="btn btn-primary">
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path>
            </svg>
            {lang === 'vi' ? 'Tạo dự án mới' : 'Create New Project'}
          </Link>
        )}
      </div>

      {/* Conditional rendering based on role */}
      {(user?.role === 'advisor' || user?.role === 'teacher') && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'flex-start' }}>
          
          {/* Advisor Projects list */}
          <div className="card">
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>{lang === 'vi' ? 'Dự án tôi hướng dẫn' : 'Projects I Supervise'}</h2>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{lang === 'vi' ? 'Bạn chưa đăng dự án nghiên cứu nào.' : "You haven't posted any research projects yet."}</p>
                <Link to="/create-project" className="btn btn-outline">{lang === 'vi' ? 'Đăng dự án đầu tiên' : 'Post Your First Project'}</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {projects.map(p => (
                  <div 
                    key={p.id} 
                    style={{ 
                      padding: '1.25rem', 
                      backgroundColor: 'var(--bg-primary)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="tag" style={{ fontSize: '0.7rem' }}>{p.department}</span>
                        <span style={{ fontSize: '0.75rem', color: p.status === 'open' ? 'var(--success-color)' : 'var(--error-color)', fontWeight: 700, textTransform: 'uppercase' }}>
                          {p.status}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                        <Link to={`/project/${p.id}`} style={{ color: 'inherit' }}>
                          {p.title}
                        </Link>
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {lang === 'vi' ? `Thành viên: ${p.current_members} / ${p.max_members} nhà nghiên cứu` : `Capacity: ${p.current_members} / ${p.max_members} researchers`}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link to={`/project/${p.id}`} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                        {lang === 'vi' ? 'Quản lý' : 'Manage'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advisor aggregate pending applications */}
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{lang === 'vi' ? `Đơn ứng tuyển chờ duyệt (${allPendingApps.length})` : `Pending Applicants (${allPendingApps.length})`}</h2>
            {allPendingApps.length === 0 ? (
              <div style={{ padding: '2rem 0', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
                {lang === 'vi' ? 'Không có đơn ứng tuyển nào đang chờ duyệt.' : 'No pending applicants across your projects.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {allPendingApps.map(app => (
                  <div 
                    key={app.id} 
                    style={{ 
                      padding: '0.8rem', 
                      backgroundColor: 'var(--bg-primary)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 'bold', marginBottom: '4px' }}>
                      {lang === 'vi' ? 'Dự án: ' : 'For: '}{app.project_title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                      <img 
                        src={app.student_avatar || '/uploads/avatar_default.png'} 
                        alt={app.student_name} 
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          <Link to={`/profile/${app.user_id}`} style={{ color: 'inherit' }}>
                            {app.student_name}
                          </Link>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{app.student_email}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      <strong>{lang === 'vi' ? 'Thư giới thiệu' : 'Cover Letter'}:</strong> "{app.cover_letter.substring(0, 100)}..."
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button 
                        onClick={() => handleApplicationDecision(app.id, 'approved')} 
                        className="btn btn-primary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flex: 1 }}
                      >
                        {lang === 'vi' ? 'Duyệt' : 'Approve'}
                      </button>
                      <button 
                        onClick={() => handleApplicationDecision(app.id, 'rejected')} 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flex: 1, color: 'var(--error-color)', borderColor: 'var(--error-color)' }}
                      >
                        {lang === 'vi' ? 'Từ chối' : 'Reject'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {user?.role === 'student' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'flex-start' }}>
          
          {/* Student joined projects */}
          <div className="card">
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>{lang === 'vi' ? `Nhóm nghiên cứu đang tham gia (${projects.length})` : `Active Research Groups (${projects.length})`}</h2>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{lang === 'vi' ? "Bạn chưa tham gia dự án nghiên cứu nào." : "You aren't a member of any research project yet."}</p>
                <Link to="/" className="btn btn-outline">{lang === 'vi' ? 'Khám phá dự án' : 'Explore Open Projects'}</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {projects.map(p => (
                  <div 
                    key={p.id} 
                    style={{ 
                      padding: '1.25rem', 
                      backgroundColor: 'var(--bg-primary)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span className="tag" style={{ fontSize: '0.7rem' }}>{p.department}</span>
                      <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                        <Link to={`/project/${p.id}`} style={{ color: 'inherit' }}>
                          {p.title}
                        </Link>
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {lang === 'vi' ? `Người hướng dẫn: ${p.advisor_name}` : `Supervisor: ${p.advisor_name}`}
                      </p>
                    </div>

                    <Link to={`/project/${p.id}`} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                      {lang === 'vi' ? 'Vào phòng Lab' : 'Enter Lab Room'}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student applications status */}
          <div className="card">
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>{lang === 'vi' ? `Đơn ứng tuyển của tôi (${applications.length})` : `My Submissions (${applications.length})`}</h2>
            {applications.length === 0 ? (
              <div style={{ padding: '2rem 0', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
                {lang === 'vi' ? 'Chưa có đơn ứng tuyển nào được nộp.' : 'No applications submitted.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {applications.map(app => (
                  <div 
                    key={app.id} 
                    style={{ 
                      padding: '1rem', 
                      backgroundColor: 'var(--bg-primary)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        <Link to={`/project/${app.project_id}`} style={{ color: 'inherit' }}>
                          {app.project_title}
                        </Link>
                      </h4>
                      <span className="tag" style={{
                        backgroundColor: 
                          app.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 
                          app.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 
                          'rgba(245, 158, 11, 0.1)',
                        color: 
                          app.status === 'approved' ? 'var(--success-color)' : 
                          app.status === 'rejected' ? 'var(--error-color)' : 
                          'var(--accent)',
                        borderColor: 'transparent',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        fontSize: '0.75rem'
                      }}>
                        {app.status === 'approved' ? (lang === 'vi' ? 'ĐÃ DUYỆT' : 'approved') : app.status === 'rejected' ? (lang === 'vi' ? 'BỊ TỪ CHỐI' : 'rejected') : (lang === 'vi' ? 'CHỜ DUYỆT' : 'pending')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {lang === 'vi' ? `Người hướng dẫn: ${app.advisor_name} • Ngày nộp: ${new Date(app.applied_at).toLocaleDateString('vi-VN')}` : `Advisor: ${app.advisor_name} • Applied: ${new Date(app.applied_at).toLocaleDateString()}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {user?.role === 'admin' && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2>{lang === 'vi' ? 'Bảng điều khiển Quản trị hệ thống' : 'System Administrator Dashboard'}</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 2rem 0', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            {lang === 'vi' ? 'Với vai trò quản trị viên hệ thống, bạn có thể xem thống kê hệ thống, quản lý các khoa nghiên cứu, chỉnh sửa hồ sơ người dùng và duyệt/xóa các tin đăng dự án.' : 'As a platform administrator, you can view system statistics, manage research departments, edit user profiles, and review/delete project listings.'}
          </p>
          <Link to="/admin" className="btn btn-primary">{lang === 'vi' ? 'Mở trang quản trị' : 'Open Admin Console'}</Link>
        </div>
      )}
    </div>
  );
}
