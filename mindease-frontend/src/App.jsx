// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// ── Page imports ──────────────────────────────────────────────
import Login    from './pages/Login'
import Register from './pages/Register'
import StudentDashboard    from './pages/StudentDashboard'
import CounsellorDashboard from './pages/CounsellorDashboard'
import AdminDashboard      from './pages/AdminDashboard'

// ── ProtectedRoute — blocks page if not logged in ─────────────
// allowedRoles is an array like ['student'] or ['counsellor','admin']
function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useAuth()

  if (!currentUser) {
    // Not logged in at all → go to login page
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // Logged in but wrong role → go to their own dashboard
    return <Navigate to={`/${currentUser.role}-dashboard`} replace />
  }

  return children   // ✅ correct role — show the page
}

// ── SmartRedirect — sends logged-in user to their dashboard ───
function SmartRedirect() {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  return <Navigate to={`/${currentUser.role}-dashboard`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public routes — anyone can visit */}
        <Route path="/"         element={<SmartRedirect />} />
        <Route path="/login"    element={<Login />}         />
        <Route path="/register" element={<Register />}      />

        {/* Student only */}
        <Route path="/student-dashboard" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        } />

        {/* Counsellor only */}
        <Route path="/counsellor-dashboard" element={
          <ProtectedRoute allowedRoles={['counsellor']}>
            <CounsellorDashboard />
          </ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* 404 — any unknown URL → go home */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  )
}