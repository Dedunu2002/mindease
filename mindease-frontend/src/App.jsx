// src/App.jsx — updated with Navbar, SOSButton, and all routes
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth }  from './context/AuthContext'
import Navbar      from './components/Navbar'
import SOSButton   from './components/SOSButton'

// Pages
import Login               from './pages/Login'
import Register            from './pages/Register'
import StudentDashboard    from './pages/StudentDashboard'
import CounsellorDashboard from './pages/CounsellorDashboard'
import AdminDashboard      from './pages/AdminDashboard'

// Placeholder imports (create empty files for these — fill in later)
// You will replace these with real pages on Days 9-26
import CheckIn    from './pages/CheckIn'
import Journal    from './pages/Journal'
import Chat       from './pages/Chat'
import Booking    from './pages/Booking'
import Resources  from './pages/Resources'
import Community  from './pages/Community'
import Exercises  from './pages/Exercises'
import Goals      from './pages/Goals'

// ── ProtectedRoute ────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(currentUser.role))
    return <Navigate to={`/${currentUser.role}-dashboard`} replace />
  return children
}

function SmartRedirect() {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  return <Navigate to={`/${currentUser.role}-dashboard`} replace />
}

// ── StudentWrapper — adds SOS button to every student page ────
function StudentWrapper({ children }) {
  return (
    <>
      {children}
      <SOSButton />
    </>
  )
}

export default function App() {
  const { currentUser } = useAuth()

  return (
    <BrowserRouter>
      {/* Navbar appears on all pages except login/register */}
      <Navbar />

      <Routes>
        {/* Public */}
        <Route path="/"         element={<SmartRedirect />} />
        <Route path="/login"    element={<Login />}         />
        <Route path="/register" element={<Register />}      />

        {/* Student routes — SOS button on every student page */}
        {[
          ["/student-dashboard", <StudentDashboard />],
          ["/checkin",           <CheckIn />],
          ["/journal",           <Journal />],
          ["/chat",              <Chat />],
          ["/booking",           <Booking />],
          ["/resources",         <Resources />],
          ["/community",         <Community />],
          ["/exercises",         <Exercises />],
          ["/goals",             <Goals />],
        ].map(([path, element]) => (
          <Route key={path} path={path} element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentWrapper>{element}</StudentWrapper>
            </ProtectedRoute>
          } />
        ))}

        {/* Counsellor */}
        <Route path="/counsellor-dashboard" element={
          <ProtectedRoute allowedRoles={['counsellor']}>
            <CounsellorDashboard />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}