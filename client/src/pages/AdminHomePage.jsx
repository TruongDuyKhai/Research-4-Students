import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, GraduationCap, MessageSquare, ShieldAlert, TrendingUp } from 'lucide-react';
import client from '../api/client';

const AdminHomePage = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    posts: 0,
    reports: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch totals in parallel by specifying limit=1 and reading total from pagination
      const [studentsRes, teachersRes, postsRes, reportsRes] = await Promise.all([
        client.get('/admin/users?role=student&limit=1'),
        client.get('/admin/teachers?limit=1'),
        client.get('/community/posts?limit=1'),
        client.get('/admin/reports?status=pending&limit=1')
      ]);

      setStats({
        students: studentsRes.data.pagination?.total || 0,
        teachers: teachersRes.data.pagination?.total || 0,
        posts: postsRes.data.pagination?.total || 0,
        reports: reportsRes.data.pagination?.total || 0
      });
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
          Dashboard Overview
        </h2>
        <p style={{ fontSize: '0.925rem', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
          Real-time platform usage metrics and pending administrative actions.
        </p>
      </div>

      {/* Stats Cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        
        {/* Students Card */}
        <div className="admin-card" style={{ borderLeft: '4px solid var(--color-primary)', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Total Students
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
            {loading ? '...' : stats.students}
          </h3>
        </div>

        {/* Teachers Card */}
        <div className="admin-card" style={{ borderLeft: '4px solid var(--color-success)', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Total Teachers
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
            {loading ? '...' : stats.teachers}
          </h3>
        </div>

        {/* Forum Posts Card */}
        <div className="admin-card" style={{ borderLeft: '4px solid #8B5CF6', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Forum Posts
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#EDE9FE', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
            {loading ? '...' : stats.posts}
          </h3>
        </div>

        {/* Pending Reports Card */}
        <div className="admin-card" style={{ borderLeft: '4px solid var(--color-warning)', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Pending Reports
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#FEF3C7', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
            {loading ? '...' : stats.reports}
          </h3>
        </div>

      </div>

      {/* Quick Actions Panel */}
      <div className="admin-card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
          <span>Management Operations Quick Guide</span>
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Use the left navigation sidebar to perform administrative tasks:
        </p>
        <ul style={{ fontSize: '0.875rem', color: 'var(--color-text)', margin: '0 0 0 20px', padding: 0, lineHeight: 2 }}>
          <li>Provision new academic accounts for <strong>Teachers</strong> and generate one-time credentials.</li>
          <li>Review and suspend malicious <strong>Student</strong> accounts violating policies.</li>
          <li>Configure matching filters on the spam <strong>Banned Keywords</strong> list.</li>
          <li>Assess reports on comments/posts and flag them as resolved.</li>
        </ul>
      </div>

    </div>
  );
};

export default AdminHomePage;
