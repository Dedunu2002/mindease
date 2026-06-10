// src/components/Navbar.jsx
import { useState }          from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth }           from '../context/AuthContext'
import '../styles/Navbar.css'

export default function Navbar() {
  const { currentUser, logout } = useAuth()
  const navigate   = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Don't show navbar on login/register pages
  if (!currentUser) return null

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* Brand */}
        <Link to="/" className="navbar-brand">
          🧠 MindEase
        </Link>

        {/* Desktop links — show different links per role */}
        <div className="navbar-links">

          {/* ── Student links ── */}
          {currentUser.role === 'student' && (<>
            <Link to="/student-dashboard">Dashboard</Link>
            <Link to="/checkin">Check-in</Link>
            <Link to="/journal">Journal</Link>
            <Link to="/chat">MindBot</Link>
            <Link to="/booking">Book Appointment</Link>
            <Link to="/resources">Resources</Link>
            <Link to="/community">Community</Link>
          </>)}

          {/* ── Counsellor links ── */}
          {currentUser.role === 'counsellor' && (<>
            <Link to="/counsellor-dashboard">Dashboard</Link>
            <Link to="/appointments">Appointments</Link>
          </>)}

          {/* ── Admin links ── */}
          {currentUser.role === 'admin' && (<>
            <Link to="/admin-dashboard">Dashboard</Link>
          </>)}

        </div>

        {/* Right side — user info + logout */}
        <div className="navbar-right">
          <span className="navbar-user">
            Hi, <strong>{currentUser.name.split(' ')[0]}</strong>
            <span className={`role-tag role-${currentUser.role}`}>
              {currentUser.role}
            </span>
          </span>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* Hamburger for mobile */}
        <button
          className="navbar-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar-mobile">
          {currentUser.role === 'student' && (<>
            <Link to="/student-dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <Link to="/checkin"           onClick={() => setMenuOpen(false)}>Check-in</Link>
            <Link to="/journal"           onClick={() => setMenuOpen(false)}>Journal</Link>
            <Link to="/chat"              onClick={() => setMenuOpen(false)}>MindBot</Link>
            <Link to="/resources"        onClick={() => setMenuOpen(false)}>Resources</Link>
          </>)}
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  )
}