import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../services/api';
import { useLang } from '../context/LanguageContext';

const DEPARTMENTS = [
  'Computer Science',
  'Biomedical Engineering',
  'Physics',
  'Chemistry',
  'Mathematics',
  'Biology',
  'Electrical Engineering'
];

export default function CreateProject() {
  const { user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

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
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: 'Computer Science',
    tags: '',
    maxMembers: 5
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Enforce advisor/admin check
  useEffect(() => {
    if (user && user.role !== 'advisor' && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { title, description, department } = formData;
    if (!title || !description || !department) {
      setErrorMsg(lang === 'vi' ? 'Tiêu đề, mô tả và chuyên khoa là bắt buộc.' : 'Title, description, and department are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.post('/api/projects', formData);
      navigate(`/project/${res.data.id}`);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || (lang === 'vi' ? 'Không thể tạo dự án.' : 'Failed to create project.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '650px', boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{lang === 'vi' ? 'Tạo dự án nghiên cứu mới' : 'Create Research Project'}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {lang === 'vi' ? 'Đăng một dự án nghiên cứu mới để tuyển thành viên sinh viên.' : 'Publish a new research project to recruit student researchers.'}
        </p>

        {errorMsg && (
          <div className="error-message show" style={{ 
            padding: '0.8rem', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid var(--error-color)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem'
          }}>
            <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="title">{lang === 'vi' ? 'Tiêu đề dự án *' : 'Project Title *'}</label>
            <input
              id="title"
              type="text"
              className="form-control"
              placeholder={lang === 'vi' ? 'Ví dụ: Học máy ứng dụng phân tích ảnh y học...' : 'e.g. Machine Learning for Medical Imaging Analysis'}
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="department">{lang === 'vi' ? 'Khoa / Ngành *' : 'Department *'}</label>
              <select
                id="department"
                className="form-control"
                value={formData.department}
                onChange={handleChange}
                required
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{getDeptLabel(dept)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="maxMembers">{lang === 'vi' ? 'Số lượng thành viên tối đa' : 'Max Member Positions'}</label>
              <input
                id="maxMembers"
                type="number"
                min="1"
                max="20"
                className="form-control"
                value={formData.maxMembers}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tags">{lang === 'vi' ? 'Từ khóa / Kỹ năng yêu cầu (phân cách bằng dấu phẩy)' : 'Keywords / Skills Required (comma-separated)'}</label>
            <input
              id="tags"
              type="text"
              className="form-control"
              placeholder={lang === 'vi' ? 'Ví dụ: Python, PyTorch, Xử lý số liệu, OpenCV' : 'e.g. Python, PyTorch, Data Processing, OpenCV'}
              value={formData.tags}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">{lang === 'vi' ? 'Mô tả dự án *' : 'Project Description *'}</label>
            <textarea
              id="description"
              className="form-control"
              rows="6"
              placeholder={lang === 'vi' ? 'Chi tiết về mục tiêu dự án, thời gian dự kiến và công việc sinh viên sẽ thực hiện...' : 'Detail the objectives of the project, the expected timeline, and what work students will perform. Be thorough to attract qualified candidates.'}
              value={formData.description}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? (lang === 'vi' ? 'Đang tạo...' : 'Creating Project...') : (lang === 'vi' ? 'Đăng dự án' : 'Publish Project')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/dashboard')}
              style={{ flex: 1 }}
            >
              {lang === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
