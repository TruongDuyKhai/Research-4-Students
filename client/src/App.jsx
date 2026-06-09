import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import api from './services/api';

// Views
import Home from './views/Home';
import Login from './views/Login';
import Register from './views/Register';
import Dashboard from './views/Dashboard';
import Profile from './views/Profile';
import CreateProject from './views/CreateProject';
import ProjectDetails from './views/ProjectDetails';
import AdminDashboard from './views/AdminDashboard';
import AdminLogin from './views/AdminLogin';
import Feed from './views/Feed';
import Documents from './views/Documents';
import QA from './views/QA';
import QADetails from './views/QADetails';
import Reviews from './views/Reviews';
import Chat from './views/Chat';

// Route guards
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        Loading session...
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save the current location we were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const verifyAdmin = async () => {
      if (authLoading) return;
      if (!user || user.role !== 'admin') {
        setIsAdmin(false);
        setVerifying(false);
        return;
      }
      try {
        await api.get('/api/admin/verify');
        setIsAdmin(true);
      } catch (err) {
        setIsAdmin(false);
      } finally {
        setVerifying(false);
      }
    };
    verifyAdmin();
  }, [user, authLoading]);

  if (authLoading || verifying) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        Verifying administrator access...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function MainAppLayout() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdminPath && <Navbar />}
      <main className={isAdminPath ? "" : "main-content"}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/community" element={<Feed />} />
          
          {/* Public Research Routes */}
          <Route path="/research/documents" element={<Documents />} />
          <Route path="/research/qa" element={<QA />} />
          <Route path="/research/qa/:id" element={<QADetails />} />
          <Route path="/research/reviews" element={<Reviews />} />
          
          {/* Aliases for convenience */}
          <Route path="/documents" element={<Navigate to="/research/documents" replace />} />
          <Route path="/qa" element={<Navigate to="/research/qa" replace />} />
          <Route path="/reviews" element={<Navigate to="/research/reviews" replace />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/profile/:id" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/create-project" element={
            <ProtectedRoute allowedRoles={['advisor', 'teacher', 'admin']}>
              <CreateProject />
            </ProtectedRoute>
          } />
          
          <Route path="/project/:id" element={
            <ProtectedRoute>
              <ProjectDetails />
            </ProtectedRoute>
          } />

          <Route path="/chat" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />

          <Route path="/research/chat" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard/*" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAdminPath && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <MainAppLayout />
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}
