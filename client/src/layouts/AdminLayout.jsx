import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  ShieldAlert, Users, GraduationCap, Key, FileText, 
  LayoutDashboard, ArrowLeft, LogOut, Sun, Moon, Laptop
} from 'lucide-react';
import './AdminLayout.css';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="admin-layout-container">
      
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo-box">
            <GraduationCap size={24} />
          </div>
          <span className="admin-brand-name">R4S Mgmt</span>
        </div>

        <nav className="admin-sidebar-menu">
          <NavLink to="" end className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="teachers" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <GraduationCap size={18} />
            <span>Teachers</span>
          </NavLink>
          
          <NavLink to="users" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <Users size={18} />
            <span>Students</span>
          </NavLink>
          
          <NavLink to="banned-keywords" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <Key size={18} />
            <span>Banlist</span>
          </NavLink>
          
          <NavLink to="reports" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <ShieldAlert size={18} />
            <span>Reports</span>
          </NavLink>
        </nav>

        {/* Sidebar Footer actions */}
        <div className="admin-sidebar-footer">
          <button 
            className="btn-admin-portal-back"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={16} />
            <span>Student Portal</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <div className="admin-main-wrapper">
        
        {/* Topbar Console Headers */}
        <header className="admin-topbar">
          <div className="topbar-left-section">
            <h2 className="topbar-console-title">Management Console</h2>
          </div>

          <div className="topbar-right-section">
            {/* Quick theme selectors */}
            <div className="topbar-theme-toggles">
              <button 
                className={`theme-icon-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                title="Light Mode"
              >
                <Sun size={16} />
              </button>
              <button 
                className={`theme-icon-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                title="Dark Mode"
              >
                <Moon size={16} />
              </button>
              <button 
                className={`theme-icon-btn ${theme === 'system' ? 'active' : ''}`}
                onClick={() => setTheme('system')}
                title="System Preferences"
              >
                <Laptop size={16} />
              </button>
            </div>

            <div className="topbar-divider"></div>

            {/* Admin User badge details */}
            <div className="topbar-admin-profile">
              <div className="admin-initials-badge">A</div>
              <div className="admin-meta-info">
                <span className="admin-name">Administrator</span>
                <span className="admin-role">System Admin</span>
              </div>
            </div>

            <button 
              className="btn-admin-logout"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Sub-page Render Box */}
        <main className="admin-subpage-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default AdminLayout;
