import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/AdminSidebar.css'

export default function AdminSidebar() {

  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const firstName =
    currentUser?.name?.split(' ')[0] || 'Admin'

  const initial =
    firstName.charAt(0).toUpperCase()

  const navItem = (to, icon, label) => (
    <NavLink
      to={to}
      end={to === '/admin-dashboard'}
      className={({ isActive }) =>
        `admin-nav-item ${isActive ? 'active' : ''}`
      }
    >
      <span className="admin-nav-icon">
        {icon}
      </span>

      <span>{label}</span>
    </NavLink>
  )

  return (
    <aside className="admin-sidebar">

      {/* BRAND */}
      <div className="admin-brand">

        <div className="admin-brand-icon">
          🧠
        </div>

        <div>
          <div className="admin-brand-name">
            MindEase
          </div>

          <div className="admin-brand-tagline">
            Administration
          </div>
        </div>

      </div>


      {/* NAVIGATION */}
      <nav className="admin-sidebar-nav">

        <div className="admin-sidebar-label">
          MAIN
        </div>

        {navItem(
          '/admin-dashboard',
          '⌂',
          'Dashboard'
        )}


        <div className="admin-sidebar-label admin-label-spaced">
          MANAGEMENT
        </div>

        {navItem(
          '/admin/users',
          '👥',
          'Users'
        )}

        {navItem(
          '/admin/counsellors',
          '🩺',
          'Counsellors'
        )}


        <div className="admin-sidebar-label admin-label-spaced">
          SYSTEM
        </div>

        {navItem(
          '/admin/analytics',
          '📊',
          'Analytics'
        )}

        {navItem(
          '/admin/settings',
          '⚙',
          'Settings'
        )}

      </nav>


      {/* PROFILE */}
      <div className="admin-sidebar-footer">

        <div className="admin-profile">

          <div className="admin-avatar">
            {initial}
          </div>

          <div className="admin-profile-info">
            <strong>{firstName}</strong>
            <span>Administrator</span>
          </div>

        </div>

        <button
          className="admin-logout"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </div>

    </aside>
  )
}