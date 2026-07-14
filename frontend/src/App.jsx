import React, { useContext, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Loader from './components/Loader';
import { ToastProvider } from './context/ToastContext';

// Lazy load pages for Code Splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const RecruiterDashboard = lazy(() => import('./pages/recruiter/RecruiterDashboard'));

// Sub-pages for admin nested routing
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents'));
const AdminATSResumes = lazy(() => import('./pages/admin/AdminATSResumes'));
const AdminTeam = lazy(() => import('./pages/admin/AdminTeam'));
const AdminPlacements = lazy(() => import('./pages/admin/AdminPlacements'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));

// Sub-pages for student nested routing
const StudentJobs = lazy(() => import('./pages/student/StudentJobs'));
const StudentApplications = lazy(() => import('./pages/student/StudentApplications'));
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'));

// Helper component for protecting student routes
const StudentRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <Loader text="Loading Kryntel..." fullScreen={true} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'student') {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Helper component for protecting admin routes
const AdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <Loader text="Loading Kryntel..." fullScreen={true} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Helper component for protecting recruiter routes
const RecruiterRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <Loader text="Loading Kryntel..." fullScreen={true} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'recruiter') {
    return <Navigate to="/" replace />;
  }

  return children;
};
function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
        <ToastProvider>
        <Navbar />
        <Suspense fallback={<Loader text="Loading Kryntel..." fullScreen={true} />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/student"
              element={
                <StudentRoute>
                  <StudentDashboard />
                </StudentRoute>
              }
            >
              <Route index element={<Navigate to="/student/jobs" replace />} />
              <Route path="jobs" element={<StudentJobs />} />
              <Route path="jobs/:jobId" element={<StudentJobs />} />
              <Route path="applications" element={<StudentApplications />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            >
              <Route index element={<Navigate to="/admin/overview" replace />} />
              <Route path="overview" element={<AdminOverview />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="ats-resumes" element={<AdminATSResumes />} />
              <Route path="post-jobs" element={<AdminPlacements />} />
              <Route path="team" element={<AdminTeam />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
            </Route>

            <Route
              path="/recruiter/*"
              element={
                <RecruiterRoute>
                  <RecruiterDashboard />
                </RecruiterRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </ToastProvider>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
