import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check, X, ExternalLink, EyeOff, AlertTriangle } from 'lucide-react';
import client from '../api/client';

const AdminReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'resolved', 'dismissed'
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchReports = async (activePage = page, activeStatus = statusFilter) => {
    setLoading(true);
    try {
      const res = await client.get(`/admin/reports?status=${activeStatus}&page=${activePage}&limit=${limit}`);
      setReports(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(page, statusFilter);
  }, [page, statusFilter]);

  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
    fetchReports(1, newStatus);
  };

  const handleAction = async (reportId, nextStatus) => {
    const actionLabel = nextStatus === 'resolved' ? 'RESOLVE' : 'DISMISS';
    if (!window.confirm(`Are you sure you want to mark this report as ${actionLabel}?`)) return;

    try {
      await client.patch(`/admin/reports/${reportId}`, { status: nextStatus });
      fetchReports();
    } catch (err) {
      console.error(`Failed to ${nextStatus} report:`, err);
      alert(`Failed to update report status to ${nextStatus}.`);
    }
  };

  const handleHideContent = async (report) => {
    const { target_type, target_id, id: reportId } = report;
    const itemLabel = target_type === 'post' ? 'post' : 'comment';
    
    if (!window.confirm(`Are you sure you want to HIDE this ${itemLabel} (ID: ${target_id}) and RESOLVE this report?`)) {
      return;
    }

    try {
      // 1. Hide the content
      if (target_type === 'post') {
        await client.patch(`/admin/community/posts/${target_id}/hide`);
      } else {
        await client.patch(`/admin/community/comments/${target_id}/hide`);
      }

      // 2. Resolve the report automatically
      await client.patch(`/admin/reports/${reportId}`, { status: 'resolved' });
      
      alert(`Content has been hidden and report resolved.`);
      fetchReports();
    } catch (err) {
      console.error('Failed to hide content and resolve report:', err);
      alert('Failed to execute hide content operation.');
    }
  };

  const openTargetItem = (postId) => {
    if (!postId) {
      alert('Cannot link to this content. It might have been permanently removed.');
      return;
    }
    window.open(`/community/posts/${postId}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Title */}
      <div className="admin-page-title-row">
        <h2 className="admin-page-title">Moderation Reports</h2>
      </div>

      {/* Tabs / Filter Row */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
        <button 
          onClick={() => handleStatusFilterChange('pending')}
          className="admin-menu-item"
          style={{ 
            background: statusFilter === 'pending' ? '#FEE2E2' : 'transparent',
            color: statusFilter === 'pending' ? 'var(--color-danger)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            border: 'none',
            outline: 'none',
            borderRadius: 'var(--radius-md)'
          }}
        >
          Pending
        </button>
        <button 
          onClick={() => handleStatusFilterChange('resolved')}
          className="admin-menu-item"
          style={{ 
            background: statusFilter === 'resolved' ? 'var(--color-primary-bg)' : 'transparent',
            color: statusFilter === 'resolved' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            border: 'none',
            outline: 'none',
            borderRadius: 'var(--radius-md)'
          }}
        >
          Resolved
        </button>
        <button 
          onClick={() => handleStatusFilterChange('dismissed')}
          className="admin-menu-item"
          style={{ 
            background: statusFilter === 'dismissed' ? 'var(--color-surface-alt)' : 'transparent',
            color: statusFilter === 'dismissed' ? 'var(--color-text)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            border: 'none',
            outline: 'none',
            borderRadius: 'var(--radius-md)'
          }}
        >
          Dismissed
        </button>
      </div>

      {/* Reports Table Card */}
      <div className="admin-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>Loading moderation logs...</div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No moderation reports in this queue.</div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <div className="table-responsive">
                <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-th">Target</th>
                    <th className="admin-th">Content Preview</th>
                    <th className="admin-th">Reporter</th>
                    <th className="admin-th">Reason</th>
                    <th className="admin-th">Submitted At</th>
                    <th className="admin-th">Status</th>
                    <th className="admin-th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const formattedDate = new Date(r.created_at.replace(' ', 'T') + 'Z').toLocaleString();
                    return (
                      <tr key={r.id}>
                        {/* Target Column */}
                        <td className="admin-td">
                          <button
                            onClick={() => openTargetItem(r.postId)}
                            className="btn-table-action-edit"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              cursor: 'pointer',
                              fontWeight: '700',
                              border: 'none',
                              background: 'transparent',
                              padding: '2px 4px',
                              color: 'var(--color-primary)'
                            }}
                            title="Open reported post in new tab"
                          >
                            <span style={{ textTransform: 'capitalize' }}>{r.target_type}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>#{r.target_id}</span>
                            <ExternalLink size={12} />
                          </button>
                        </td>

                        {/* Preview Column */}
                        <td className="admin-td" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                            {r.targetContent || '(Content not available)'}
                          </span>
                        </td>

                        {/* Reporter Column */}
                        <td className="admin-td">
                          {r.reporter ? (
                            <span style={{ fontWeight: '600' }}>@{r.reporter.username}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)' }}>Unknown User</span>
                          )}
                        </td>

                        {/* Reason Column */}
                        <td className="admin-td" style={{ maxWidth: '200px', wordBreak: 'break-word', fontSize: '0.85rem' }}>
                          {r.reason}
                        </td>

                        {/* Submitted Date */}
                        <td className="admin-td" style={{ fontSize: '0.8rem' }}>{formattedDate}</td>

                        {/* Status Column */}
                        <td className="admin-td">
                          <span className={`admin-status-badge status-${r.status}`}>
                            {r.status}
                          </span>
                        </td>

                        {/* Actions Column */}
                        <td className="admin-td" style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {r.status === 'pending' && (
                              <>
                                <button 
                                  className="btn-table-action-edit"
                                  style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', backgroundColor: 'transparent' }}
                                  onClick={() => handleAction(r.id, 'resolved')}
                                  title="Mark as Resolved (No changes to content)"
                                >
                                  <Check size={12} style={{ color: 'var(--color-success)' }} />
                                  <span>Resolve</span>
                                </button>
                                
                                <button 
                                  className="btn-table-action-delete"
                                  style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', backgroundColor: 'transparent' }}
                                  onClick={() => handleHideContent(r)}
                                  title="Hide Content & Resolve Report"
                                >
                                  <EyeOff size={12} style={{ color: 'var(--color-danger)' }} />
                                  <span>Hide & Resolve</span>
                                </button>
                                
                                <button 
                                  className="btn-table-action-reset"
                                  style={{ borderColor: 'var(--color-text-secondary)', color: 'var(--color-text-secondary)', backgroundColor: 'transparent' }}
                                  onClick={() => handleAction(r.id, 'dismissed')}
                                  title="Dismiss Report"
                                >
                                  <X size={12} style={{ color: 'var(--color-text-secondary)' }} />
                                  <span>Dismiss</span>
                                </button>
                              </>
                            )}
                            {r.status !== 'pending' && (
                              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                                Handled
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="admin-pagination-row">
                <span className="admin-pagination-info">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} reports
                </span>
                <div className="admin-pagination-btns">
                  <button 
                    className="btn-community-page"
                    disabled={page === 1}
                    onClick={() => setPage(prev => prev - 1)}
                  >
                    &larr; Prev
                  </button>
                  <button 
                    className="btn-community-page"
                    disabled={page >= Math.ceil(total / limit)}
                    onClick={() => setPage(prev => prev + 1)}
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default AdminReportsPage;
