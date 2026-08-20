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

  return (
    <aside className="student-sidebar">

      {/* Brand */}
      <div className="student-sidebar-brand">
        <div className="sidebar-brand-icon">🧠</div>

        <div>
          <div className="sidebar-brand-name">MindEase</div>
          <div className="sidebar-brand-subtitle">
            Your space to breathe
          </div>
        </div>
      </div>


      {/* Navigation */}
      <nav className="student-sidebar-nav">

        <div className="sidebar-section-title">
          MAIN
        </div>

        <NavLink
          to="/student-dashboard"
          className={({ isActive }) =>
            `student-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="student-nav-icon">🏠</span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/checkin"
          className={({ isActive }) =>
            `student-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="student-nav-icon mood-icon">💛</span>
          <span>My Mood</span>
        </NavLink>

        <NavLink
          to="/journal"
          className={({ isActive }) =>
            `student-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="student-nav-icon">📝</span>
          <span>Journal</span>
        </NavLink>

        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `student-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="student-nav-icon">🤖</span>
          <span>MindBot</span>
        </NavLink>


        <div className="sidebar-section-title">
          SELF-CARE
        </div>

        <NavLink
          to="/exercises"
          className={({ isActive }) =>
            `student-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="student-nav-icon">🌸</span>
          <span>Wellness Exercises</span>
        </NavLink>

        <NavLink
          to="/goals"
          className={({ isActive }) =>
            `student-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="student-nav-icon">🎯</span>
          <span>My Goals</span>
        </NavLink>

        <NavLink
          to="/resources"
          className={({ isActive }) =>
            `student-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="student-nav-icon">📚</span>
          <span>Resources</span>
        </NavLink>


        <div className="sidebar-section-title">
          SUPPORT
        </div>

        <NavLink
          to="/booking"
          className={({ isActive }) =>
            `student-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="student-nav-icon">🌿</span>
          <span>Counsellor</span>
        </NavLink>

        <NavLink
          to="/community"
          className={({ isActive }) =>
            `student-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="student-nav-icon">🤝</span>
          <span>Community</span>
        </NavLink>

      </nav>


      {/* Bottom user area */}
      <div className="student-sidebar-bottom">

        <div className="sidebar-user-card">

          <div className="sidebar-avatar">
            {currentUser?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>

          <div className="sidebar-user-info">
            <strong>
              {currentUser?.name?.split(' ')[0] || 'Student'}
            </strong>

            <span>Student</span>
          </div>

          <button
            className="sidebar-logout"
            onClick={handleLogout}
            title="Logout"
          >
            ↪
          </button>

        </div>

      </div>

    </aside>
  )
}