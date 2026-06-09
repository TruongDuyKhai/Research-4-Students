import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

export default function ProjectDetails() {
  const { id: projectId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { lang } = useLang();

  const getDeptLabel = (dept) => {
    if (dept === 'Computer Science') return lang === 'vi' ? 'Khoa học máy tính' : 'Computer Science';
    if (dept === 'Biomedical Engineering') return lang === 'vi' ? 'Kỹ thuật y sinh' : 'Biomedical Engineering';
    if (dept === 'Physics') return lang === 'vi' ? 'Vật lý' : 'Physics';
    if (dept === 'Chemistry') return lang === 'vi' ? 'Hóa học' : 'Chemistry';
    if (dept === 'Mathematics') return lang === 'vi' ? 'Toán học' : 'Mathematics';
    if (dept === 'Biology') return lang === 'vi' ? 'Sinh học' : 'Biology';
    if (dept === 'Electrical Engineering') return lang === 'vi' ? 'Kỹ thuật điện' : 'Electrical Engineering';
    return dept;
  };

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [userApplication, setUserApplication] = useState(null);
  const [applications, setApplications] = useState([]); // visible to advisor
  const [loading, setLoading] = useState(true);

  // Apply Form State
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const chatBottomRef = useRef(null);

  const isAdvisorOwner = user && project && project.created_by === user.id;
  const isMember = user && (members.some(m => m.id === user.id) || isAdvisorOwner || user.role === 'admin');

  // Fetch Project details
  const fetchProjectData = async () => {
    try {
      const res = await axios.get(`/api/projects/${projectId}`);
      setProject(res.data.project);
      setMembers(res.data.members || []);
      setUserApplication(res.data.userApplication);

      // If advisor owner, load applications list
      if (user && res.data.project.created_by === user.id) {
        const appsRes = await axios.get(`/api/projects/${projectId}/applications`);
        setApplications(appsRes.data);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch chat history if member
  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(`/api/projects/${projectId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchProjectData();
  }, [projectId, user]);

  // Handle live chat Socket connection
  useEffect(() => {
    if (!isMember || !socket || !project) return;

    // Join room
    socket.emit('join_project', { projectId });
    fetchChatHistory();

    // Listen for new messages
    socket.on('receive_message', (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    });

    // Listen for error alerts from socket
    socket.on('error_message', (msg) => {
      alert(msg);
    });

    return () => {
      socket.emit('leave_project', { projectId });
      socket.off('receive_message');
      socket.off('error_message');
    };
  }, [isMember, socket, project, projectId]);

  // Scroll to bottom on new chat message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Apply to project
  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    try {
      await axios.post(`/api/projects/${projectId}/apply`, { coverLetter });
      alert(lang === 'vi' ? 'Nộp đơn ứng tuyển thành công.' : 'Application submitted successfully.');
      setApplyOpen(false);
      setCoverLetter('');
      fetchProjectData();
    } catch (err) {
      alert(err.response?.data?.error || (lang === 'vi' ? 'Không thể nộp đơn.' : 'Failed to apply.'));
    } finally {
      setApplying(false);
    }
  };

  // Advisor: Approve or Reject application
  const handleApplicationDecision = async (appId, decision) => {
    if (!window.confirm(lang === 'vi' ? `Bạn có chắc chắn muốn ${decision === 'approved' ? 'chấp nhận' : 'từ chối'} đơn ứng tuyển này?` : `Are you sure you want to ${decision} this application?`)) return;

    try {
      await axios.put(`/api/applications/${appId}`, { status: decision });
      alert(lang === 'vi' ? `Đã xử lý đơn ứng tuyển thành công.` : `Application ${decision} successfully.`);
      fetchProjectData(); // reload members & applications
    } catch (err) {
      alert(err.response?.data?.error || (lang === 'vi' ? 'Không thể thực hiện hành động này.' : 'Failed to handle decision.'));
    }
  };

  // Handle message sending
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !socket) return;
    
    socket.emit('send_message', { projectId, message: messageText });
    setMessageText('');
  };

  if (loading) {
    return <div className="container main-content" style={{ textAlign: 'center', padding: '5rem 0' }}>{lang === 'vi' ? 'Đang tải chi tiết...' : 'Loading details...'}</div>;
  }

  if (!project) {
    return (
      <div className="container main-content">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>{lang === 'vi' ? 'Không tìm thấy dự án' : 'Project Not Found'}</h2>
          <p style={{ margin: '1rem 0' }}>{lang === 'vi' ? 'Dự án được yêu cầu không tồn tại.' : 'The requested project does not exist.'}</p>
          <Link to="/" className="btn btn-primary">{lang === 'vi' ? 'Quay lại danh mục' : 'Go to Catalog'}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container main-content">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Left Column: Project Details & Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Project Details */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span className="tag" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-light)' }}>
                {getDeptLabel(project.department)}
              </span>
              <span style={{ 
                fontSize: '0.8rem', 
                color: project.status === 'open' ? 'var(--success-color)' : 'var(--error-color)',
                fontWeight: 700, 
                textTransform: 'uppercase' 
              }}>
                {project.status === 'open' ? (lang === 'vi' ? 'MỞ' : 'open') : (lang === 'vi' ? 'ĐÓNG' : 'closed')}
              </span>
            </div>

            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{project.title}</h1>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', whiteSpace: 'pre-wrap', lineHeight: '1.7', marginBottom: '2rem' }}>
              {project.description}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {project.tags.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>

            {/* Action buttons for Students */}
            {user && user.role === 'student' && !isMember && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                {userApplication ? (
                  <div style={{ 
                    padding: '1rem', 
                    backgroundColor: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong>{lang === 'vi' ? 'Trạng thái ứng tuyển:' : 'Your Application Status:'}</strong>
                      <div style={{ fontSize: '0.9rem', color: 'var(--accent)', textTransform: 'capitalize', fontWeight: 'bold', marginTop: '2px' }}>
                        {userApplication.status === 'approved' ? (lang === 'vi' ? 'Được nhận' : 'approved') : userApplication.status === 'rejected' ? (lang === 'vi' ? 'Từ chối' : 'rejected') : (lang === 'vi' ? 'Đang chờ duyệt' : 'pending')}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {lang === 'vi' ? `Ngày ứng tuyển: ${new Date(userApplication.applied_at).toLocaleDateString('vi-VN')}` : `Applied on: ${new Date(userApplication.applied_at).toLocaleDateString()}`}
                    </div>
                  </div>
                ) : project.status === 'closed' ? (
                  <button className="btn btn-outline" style={{ width: '100%' }} disabled>
                    {lang === 'vi' ? 'Đã đóng tuyển thành viên' : 'Applications Closed'}
                  </button>
                ) : applyOpen ? (
                  <form onSubmit={handleApply}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="coverLetter">{lang === 'vi' ? 'Thư giới thiệu / Tại sao bạn muốn tham gia? *' : 'Cover Letter / Why do you want to join? *'}</label>
                      <textarea
                        id="coverLetter"
                        className="form-control"
                        rows="4"
                        placeholder={lang === 'vi' ? 'Viết thư giới thiệu ngắn gọn làm nổi bật các kỹ năng, thời gian biểu và sự phù hợp của bạn với dự án...' : 'Write a brief cover letter highlighting your skills, availability, and alignment with the project description...'}
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button type="submit" className="btn btn-primary" disabled={applying}>
                        {applying ? (lang === 'vi' ? 'Đang gửi...' : 'Submitting...') : (lang === 'vi' ? 'Nộp đơn ứng tuyển' : 'Submit Application')}
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => setApplyOpen(false)}>
                        {lang === 'vi' ? 'Hủy' : 'Cancel'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setApplyOpen(true)}>
                    {lang === 'vi' ? 'Ứng tuyển vào dự án nghiên cứu này' : 'Apply for this Research Position'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Real-time Collaboration Chat (Visible only to approved members/advisor) */}
          {isMember ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
              <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--success-color)', borderRadius: '50%', display: 'inline-block' }}></span>
                  {lang === 'vi' ? 'Thảo luận nhóm' : 'Group Discussion'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lang === 'vi' ? 'Kênh trò chuyện thời gian thực' : 'Real-time Chatroom'}</span>
              </div>

              {/* Messages viewport */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {lang === 'vi' ? 'Chưa có tin nhắn trong phòng này. Hãy bắt đầu trò chuyện!' : 'No messages in this chat yet. Start the conversation!'}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwnMsg = user && msg.user_id === user.id;
                    return (
                      <div 
                        key={msg.id} 
                        style={{ 
                          display: 'flex', 
                          gap: '8px', 
                          alignItems: 'flex-start',
                          alignSelf: isOwnMsg ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          flexDirection: isOwnMsg ? 'row-reverse' : 'row'
                        }}
                      >
                        <img 
                          src={msg.sender_avatar || '/uploads/avatar_default.png'} 
                          alt={msg.sender_name} 
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--text-secondary)', 
                            marginBottom: '2px', 
                            textAlign: isOwnMsg ? 'right' : 'left' 
                          }}>
                            {msg.sender_name} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({msg.sender_role === 'teacher' ? (lang === 'vi' ? 'Giáo viên' : 'Teacher') : msg.sender_role === 'student' ? (lang === 'vi' ? 'Sinh viên' : 'Student') : (lang === 'vi' ? 'Quản trị viên' : 'Admin')})</span>
                          </div>
                          <div style={{ 
                            backgroundColor: isOwnMsg ? 'var(--accent-light)' : 'var(--bg-secondary)', 
                            border: `1px solid ${isOwnMsg ? 'var(--accent)' : 'var(--border-color)'}`,
                            padding: '0.6rem 0.8rem',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            wordBreak: 'break-word',
                            lineHeight: '1.4'
                          }}>
                            {msg.message}
                          </div>
                          <div style={{ 
                            fontSize: '0.65rem', 
                            color: 'var(--text-muted)', 
                            marginTop: '2px', 
                            textAlign: isOwnMsg ? 'right' : 'left' 
                          }}>
                            {new Date(msg.created_at).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder={lang === 'vi' ? 'Nhập tin nhắn gửi tới nhóm...' : 'Type a message to the team...'}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem' }}>
                  {lang === 'vi' ? 'Gửi' : 'Send'}
                </button>
              </form>
            </div>
          ) : (
            user && (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                <svg style={{ width: '40px', height: '40px', margin: '0 auto 1rem auto', color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                <p>{lang === 'vi' ? 'Kênh chat của nhóm đã bị khóa. Bạn phải là thành viên được duyệt để tham gia.' : 'Team chat room is locked. You must be an approved project researcher to access group discussion.'}</p>
              </div>
            )
          )}
        </div>

        {/* Right Column: Advisor details, Member List, Pending Applications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Advisor Info */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{lang === 'vi' ? 'Người hướng dẫn' : 'Project Advisor'}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <img 
                src={project.advisor_avatar || '/uploads/avatar_default.png'} 
                alt={project.advisor_name} 
                style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--accent)', objectFit: 'cover' }}
              />
              <div>
                <h4 style={{ fontSize: '1.05rem' }}>
                  <Link to={`/profile/${project.created_by}`} style={{ color: 'inherit' }}>
                    {project.advisor_name}
                  </Link>
                </h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{project.advisor_email}</div>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: '2px solid var(--border-color)', paddingLeft: '8px' }}>
              {project.advisor_bio ? `${project.advisor_bio.substring(0, 100)}...` : (lang === 'vi' ? 'Giáo viên hướng dẫn' : 'Faculty Advisor')}
            </p>
          </div>

          {/* Members List */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{lang === 'vi' ? 'Thành viên nhóm' : 'Approved Team'}</h3>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {members.length} / {project.max_members}
              </span>
            </div>

            {members.length === 0 ? (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{lang === 'vi' ? 'Chưa có thành viên sinh viên nào.' : 'No student members yet.'}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {members.map((member) => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                      src={member.avatar || '/uploads/avatar_default.png'} 
                      alt={member.full_name} 
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Link to={`/profile/${member.id}`} style={{ color: 'inherit' }}>
                          {member.full_name}
                        </Link>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {member.role === 'teacher' ? (lang === 'vi' ? 'Giáo viên' : 'Teacher') : member.role === 'student' ? (lang === 'vi' ? 'Sinh viên' : 'Student') : (lang === 'vi' ? 'Quản trị viên' : 'Admin')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Applications Review Panel (Only visible to advisor owner) */}
          {isAdvisorOwner && (
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                {lang === 'vi' ? `Đơn ứng tuyển đang chờ duyệt (${applications.filter(a => a.status === 'pending').length})` : `Pending Applications (${applications.filter(a => a.status === 'pending').length})`}
              </h3>
              
              {applications.filter(a => a.status === 'pending').length === 0 ? (
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{lang === 'vi' ? 'Không có đơn ứng tuyển nào đang chờ.' : 'No pending applications.'}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {applications.filter(a => a.status === 'pending').map((app) => (
                    <div 
                      key={app.id} 
                      style={{ 
                        padding: '0.8rem', 
                        backgroundColor: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                        <img 
                          src={app.student_avatar || '/uploads/avatar_default.png'} 
                          alt={app.student_name} 
                          style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <Link to={`/profile/${app.user_id}`} style={{ color: 'inherit' }}>
                              {app.student_name}
                            </Link>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{app.student_email}</div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', lineBreak: 'anywhere' }}>
                        <strong>{lang === 'vi' ? 'Kỹ năng:' : 'Skills:'}</strong> {app.student_skills || (lang === 'vi' ? 'Không' : 'None listed')}
                      </div>

                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: 'var(--text-secondary)', 
                        backgroundColor: 'var(--bg-secondary)', 
                        padding: '0.5rem', 
                        borderRadius: '4px',
                        marginBottom: '0.8rem',
                        maxHeight: '100px',
                        overflowY: 'auto'
                      }}>
                        {app.cover_letter}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleApplicationDecision(app.id, 'approved')} 
                          className="btn btn-primary" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', flex: 1 }}
                        >
                          {lang === 'vi' ? 'Duyệt' : 'Approve'}
                        </button>
                        <button 
                          onClick={() => handleApplicationDecision(app.id, 'rejected')} 
                          className="btn btn-outline" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', flex: 1, color: 'var(--error-color)', borderColor: 'var(--error-color)' }}
                        >
                          {lang === 'vi' ? 'Từ chối' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
