// src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import StudentSidebar from './components/StudentSidebar'
import SOSButton from './components/SOSButton'
import './styles/StudentAppLayout.css'

// Pages
import Login               from './pages/Login'
import Register            from './pages/Register'
import StudentDashboard    from './pages/StudentDashboard'
import CounsellorDashboard from './pages/CounsellorDashboard'
import AdminDashboard      from './pages/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCounsellors from './pages/admin/AdminCounsellors'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminSettings from './pages/admin/AdminSettings' 

import CheckIn             from './pages/CheckIn'
import Journal             from './pages/Journal'
import Chat                from './pages/Chat'
import Booking             from './pages/Booking'
import Resources           from './pages/Resources'
import Community           from './pages/Community'
import Exercises           from './pages/Exercises'
import Goals               from './pages/Goals'
import WeeklySentiment     from './pages/WeeklySentiment'

import CounsellorAppointments
  from './pages/CounsellorAppointments'


// ============================================================
// PROTECTED ROUTE
// ============================================================

function ProtectedRoute({ children, allowedRoles }) {

  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(currentUser.role)
  ) {
    return (
      <Navigate
        to={`/${currentUser.role}-dashboard`}
        replace
      />
    )
  }

  return children
}


// ============================================================
// SMART REDIRECT
// ============================================================

function SmartRedirect() {

  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return (
    <Navigate
      to={`/${currentUser.role}-dashboard`}
      replace
    />
  )
}


// ============================================================
// STUDENT WRAPPER
// Sidebar + SOS button appear on every student page
// ============================================================

function StudentWrapper({ children }) {

  return (
    <div className="student-app-layout">

      <StudentSidebar />

      <main className="student-app-content">
        {children}
      </main>

      <SOSButton />

    </div>
  )
}


// ============================================================
// APP
// ============================================================

export default function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* ==================================================
            PUBLIC
        ================================================== */}

        <Route
          path="/"
          element={<SmartRedirect />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />


        {/* ==================================================
            STUDENT
        ================================================== */}

        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentWrapper>
                <StudentDashboard />
              </StudentWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkin"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentWrapper>
                <CheckIn />
              </StudentWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/journal"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentWrapper>
                <Journal />
              </StudentWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentWrapper>
                <Chat />
              </StudentWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/booking"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentWrapper>
                <Booking />
              </StudentWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/resources"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentWrapper>
                <Resources />
              </StudentWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/community"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentWrapper>
                <Community />
              </StudentWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/exercises"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentWrapper>
                <Exercises />
              </StudentWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/goals"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentWrapper>
                <Goals />
              </StudentWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/weekly-sentiment"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentWrapper>
                <WeeklySentiment />
              </StudentWrapper>
            </ProtectedRoute>
          }
        />


        {/* ==================================================
            COUNSELLOR
        ================================================== */}

        <Route
          path="/counsellor-dashboard"
          element={
            <ProtectedRoute allowedRoles={['counsellor']}>
              <CounsellorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
  path="/counsellor-appointments"
  element={
    <ProtectedRoute allowedRoles={['counsellor']}>
      <CounsellorAppointments />
    </ProtectedRoute>
  }
/>


        {/* ==================================================
            ADMIN
        ================================================== */}

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
  path="/admin/users"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminUsers />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/counsellors"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminCounsellors />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/analytics"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminAnalytics />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/settings"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminSettings />
    </ProtectedRoute>
  }
/>


        {/* ==================================================
            FALLBACK
        ================================================== */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>

    </BrowserRouter>
  )
}