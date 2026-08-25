import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/CounsellorSidebar.css'

export default function CounsellorSidebar() {

  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    {
      path: '/counsellor-dashboard',
      icon: '⌂',
      label: 'Dashboard',
      end: true
    },
    {
      path: '/counsellor-appointments',
      icon: '◫',
      label: 'Appointments'
    },
    {
      path: '/counsellor-students',
      icon: '♙',
      label: 'Students'
    },
    {
      path: '/counsellor-resources',
      icon: '▦',
      label: 'Resources'
    },
    {
      path: '/counsellor-reports',
      icon: '▤',
      label: 'Reports'
    }
  ]

  return (
    <aside className="counsellor-sidebar">

      {/* ==================================================
          BRAND
      ================================================== */}

      <div className="counsellor-sidebar-brand">

        <div className="counsellor-logo">
          🧑‍⚕️
        </div>

        <div>
          <strong>MindEase</strong>
          <span>Counsellor Portal</span>
        </div>

      </div>


      {/* ==================================================
          PROFILE
      ================================================== */}

      <div className="counsellor-profile">

        <div className="counsellor-profile-avatar">
          {currentUser?.name
            ?.charAt(0)
            ?.toUpperCase() || 'C'}
        </div>

        <div className="counsellor-profile-info">

          <strong>
            {currentUser?.name || 'Counsellor'}
          </strong>

          <span>
            Counsellor
          </span>

        </div>

      </div>


      {/* ==================================================
          NAVIGATION
      ================================================== */}

      <nav className="counsellor-nav">

        <span className="counsellor-nav-title">
          MAIN MENU
        </span>

        {navItems.map(item => (

          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `counsellor-nav-link ${
                isActive
                  ? 'counsellor-nav-active'
                  : ''
              }`
            }
          >

            <span className="counsellor-nav-icon">
              {item.icon}
            </span>

            <span>
              {item.label}
            </span>

          </NavLink>

        ))}

      </nav>


      {/* ==================================================
          PRIVACY
      ================================================== */}

      <div className="counsellor-sidebar-note">

        <span>🔒</span>

        <div>
          <strong>Privacy protected</strong>

          <p>
            Campus analytics are shown
            anonymously.
          </p>
        </div>

      </div>


      {/* ==================================================
          BOTTOM
      ================================================== */}

      <div className="counsellor-sidebar-bottom">

        <button
          className="counsellor-logout"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </div>

    </aside>
  )
}