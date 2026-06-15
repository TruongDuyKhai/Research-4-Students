import React, { useState, useEffect } from 'react';
import { Trash2, Plus, ShieldAlert, Key } from 'lucide-react';
import client from '../api/client';

const AdminBanlistPage = () => {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form fields
  const [keyword, setKeyword] = useState('');
  const [matchType, setMatchType] = useState('contains');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchKeywords = async () => {
    setLoading(true);
    try {
      const res = await client.get('/admin/banned-keywords');
      setKeywords(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch banned keywords:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!keyword.trim()) return;

    setSubmitting(true);
    try {
      await client.post('/admin/banned-keywords', {
        keyword: keyword.trim(),
        match_type: matchType
      });
      setKeyword('');
      setMatchType('contains');
      fetchKeywords();
    } catch (err) {
      console.error('Failed to add banned keyword:', err);
      setErrorMsg(err.response?.data?.error?.message || 'Failed to add keyword.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, word) => {
    if (!window.confirm(`Are you sure you want to delete keyword "${word}" from the banlist?`)) return;

    try {
      await client.delete(`/admin/banned-keywords/${id}`);
      fetchKeywords();
    } catch (err) {
      console.error('Failed to delete banned keyword:', err);
      alert('Failed to delete keyword.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Title */}
      <div className="admin-page-title-row">
        <h2 className="admin-page-title">Spam Banned Keywords</h2>
      </div>

      {/* Grid: Form (Left) & Keywords List (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.5fr',
        gap: '24px',
        alignItems: 'flex-start'
      }}>
        
        {/* Quick Add Form */}
        <div className="admin-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} style={{ color: 'var(--color-danger)' }} />
            <span>Add Banned Keyword</span>
          </h3>

          {errorMsg && (
            <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: '600' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Keyword / Phrase *</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. spamword123"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Match Type *</label>
              <select 
                className="form-input"
                value={matchType}
                onChange={(e) => setMatchType(e.target.value)}
                disabled={submitting}
              >
                <option value="contains">Contains (matches sub-string)</option>
                <option value="exact">Exact (matches exact keyword)</option>
                <option value="regex">Regex (regular expression pattern)</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="btn-admin-primary"
              disabled={submitting || !keyword.trim()}
            >
              {submitting ? 'Adding...' : 'Add to Banlist'}
            </button>
          </form>
        </div>

        {/* Banned Keywords List */}
        <div className="admin-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} style={{ color: 'var(--color-text-secondary)' }} />
            <span>Active Filter Keywords ({keywords.length})</span>
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>Loading banlist...</div>
          ) : keywords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>No keywords added yet. Forum posts and comments are unfiltered.</div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-th">Keyword</th>
                    <th className="admin-th">Match Type</th>
                    <th className="admin-th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw) => (
                    <tr key={kw.id}>
                      <td className="admin-td" style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-danger)' }}>
                        {kw.keyword}
                      </td>
                      <td className="admin-td">
                        <span className="admin-status-badge status-archived" style={{ fontSize: '0.65rem' }}>
                          {kw.match_type}
                        </span>
                      </td>
                      <td className="admin-td" style={{ textAlign: 'right' }}>
                        <button 
                          className="btn-table-action-delete"
                          onClick={() => handleDelete(kw.id, kw.keyword)}
                          title="Delete keyword"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default AdminBanlistPage;
