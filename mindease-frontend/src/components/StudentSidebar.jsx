import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/StudentSidebar.css'

export default function StudentSidebar() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const firstName = currentUser?.name?.split(' ')[0] || 'Student'
  const initial = firstName.charAt(0).toUpperCase()

  const navItem = (to, icon, label, extraClass = '') => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `student-nav-item ${isActive ? 'active' : ''} ${extraClass}`
      }
    >
      <span className="student-nav-icon">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )

  return (
    <aside className="student-sidebar">

      {/* Brand */}
      <div className="student-brand">
        <div className="student-brand-icon">
          🧠
        </div>

        <div className="student-brand-text">
          <div className="student-brand-name">MindEase</div>
          <div className="student-brand-tagline">
            Your space to breathe
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="student-sidebar-nav">

        <div className="sidebar-label">MAIN</div>

        {navItem('/student-dashboard', '⌂', 'Dashboard')}
        {navItem('/checkin', '💛', 'My Mood')}
        {navItem('/insights', '◒', 'My Insights')}
        {navItem('/journal', '✎', 'Journal')}
        {navItem('/chat', '✦', 'MindBot')}

        <div className="sidebar-label sidebar-label-spaced">
          SELF-CARE
        </div>

        {navItem('/exercises', '🌿', 'Wellness')}
        {navItem('/goals', '◎', 'My Goals')}
        {navItem('/resources', '▣', 'Resources')}

        <div className="sidebar-label sidebar-label-spaced">
          SUPPORT
        </div>

        {navItem('/booking', '♡', 'Counsellor')}
        {navItem('/community', '♧', 'Community')}

      </nav>

      {/* Bottom profile */}
      <div className="student-sidebar-footer">

        <NavLink
          to="/profile"
          className="sidebar-profile-card"
        >
          <div className="sidebar-avatar">
            {initial}
          </div>

          <div className="sidebar-profile-info">
            <strong>{firstName}</strong>
            <span>Student</span>
          </div>

          <span className="sidebar-profile-arrow">›</span>
        </NavLink>

        <div className="sidebar-account-links">
          <NavLink to="/profile">
            <span>◉</span>
            Profile
          </NavLink>

          <NavLink to="/profile/edit">
            <span>✎</span>
            Edit profile
          </NavLink>

          <button onClick={handleLogout}>
            <span>↪</span>
            Logout
          </button>
        </div>

      </div>

    </aside>
  )
}