
// src/pages/CounsellorDashboard.jsx
import { useAuth }     from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function CounsellorDashboard() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <div style={{ padding:'40px', fontFamily:'Arial' }}>
      <h1 style={{ color:'#1A7A5E' }}>🩺 Counsellor Portal</h1>
      <p>Welcome Dr. <strong>{currentUser?.name}</strong></p>
      <p style={{ color:'#666' }}>Full dashboard coming on Day 27 ✅</p>
      <button onClick={handleLogout}
        style={{ background:'#e24b4a', color:'white', border:'none',
                 padding:'10px 20px', borderRadius:'8px', cursor:'pointer' }}>
        Logout
      </button>
    </div>
  )
}

