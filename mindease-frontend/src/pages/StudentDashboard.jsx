// src/pages/StudentDashboard.jsx
import StudentSidebar from '../components/StudentSidebar'
import { useState, useEffect } from 'react'
import { Link }               from 'react-router-dom'
import { useAuth }            from '../context/AuthContext'
import api                    from '../api/axios'
import '../styles/StudentDashboard.css'

export default function StudentDashboard() {
  const { currentUser } = useAuth()

  // State to hold data loaded from Flask
  const [streak,      setStreak]      = useState(null)
  const [lastCheckin, setLastCheckin] = useState(null)
  const [lastMood,    setLastMood]    = useState(null)
  const [loading,     setLoading]     = useState(true)

  // Load data when dashboard page opens
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // These Flask routes will be created on Day 9 and Day 14
        // For now they return 404 — that's fine, we catch the error
        const [streakRes, checkinRes] = await Promise.allSettled([
          api.get('/streak'),
          api.get('/checkins/latest'),
        ])
        if (streakRes.status === 'fulfilled')
          setStreak(streakRes.value.data)
        if (checkinRes.status === 'fulfilled')
          setLastCheckin(checkinRes.value.data)
      } catch {
        // Silently ignore — data not available yet
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])   // [] = run once on mount

  // Risk badge colour helper
  const riskClass = (risk) => ({
    'Good':     'badge-good',
    'Moderate': 'badge-moderate',
    'Poor':     'badge-poor',
  }[risk] || 'badge-good')

  return (
  <div className="student-layout">

    <StudentSidebar />

    <main className="student-main">

      {/* Welcome header */}
      <div className="dash-header">
        <div>
          <h1>Welcome back, {currentUser?.name?.split(' ')[0]} 👋</h1>
          <p>How are you feeling today?</p>
        </div>
        <Link to="/checkin" className="btn-primary">
          ✅ Daily Check-in
        </Link>
      </div>

      {/* Top stats row */}
      <div className="dash-stats">

        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <div>
            <p className="stat-label">Current Streak</p>
            <p className="stat-value">
              {loading ? '...' : `${streak?.current_streak || 0} days`}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🧠</span>
          <div>
            <p className="stat-label">Last Risk Level</p>
            <p className="stat-value">
              {loading ? '...' : lastCheckin
                ? <span className={riskClass(lastCheckin.risk_result)}>{lastCheckin.risk_result}</span>
                : 'No check-in yet'}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🏅</span>
          <div>
            <p className="stat-label">Badges Earned</p>
            <p className="stat-value">
              {loading ? '...' : streak?.badges?.length || 0}
            </p>
          </div>
        </div>

      </div>

      {/* Feature cards grid */}
      <div className="dash-grid">

        <Link to="/checkin" className="feature-card">
          <div className="feature-icon" style={{background:'#E1F5EE'}}>📊</div>
          <h3>Daily Check-in</h3>
          <p>Answer 7 quick questions and get your AI mental health risk result instantly</p>
          <span className="feature-link">Start today's check-in →</span>
        </Link>

        <Link to="/journal" className="feature-card">
          <div className="feature-icon" style={{background:'#EEEDFE'}}>📓</div>
          <h3>Daily Journal</h3>
          <p>Write freely — AI detects your emotion and tracks your mood trend over time</p>
          <span className="feature-link">Write today's entry →</span>
        </Link>

        <Link to="/chat" className="feature-card">
          <div className="feature-icon" style={{background:'#E6F1FB'}}>💬</div>
          <h3>MindBot</h3>
          <p>Talk to your AI wellness companion anytime — available 24/7, always non-judgmental</p>
          <span className="feature-link">Chat now →</span>
        </Link>

        <Link to="/booking" className="feature-card">
          <div className="feature-icon" style={{background:'#FAEEDA'}}>📅</div>
          <h3>Book Appointment</h3>
          <p>Schedule a private session with a university counsellor at a time that suits you</p>
          <span className="feature-link">View available slots →</span>
        </Link>

        <Link to="/exercises" className="feature-card">
          <div className="feature-icon" style={{background:'#EAF3DE'}}>🌿</div>
          <h3>Wellness Exercises</h3>
          <p>Guided breathing and grounding exercises to calm your mind in minutes</p>
          <span className="feature-link">Try box breathing →</span>
        </Link>

        <Link to="/goals" className="feature-card">
          <div className="feature-icon" style={{background:'#F3E8FF'}}>🎯</div>
          <h3>Weekly Goals</h3>
          <p>Set a wellness goal for the week and track whether you achieve it</p>
          <span className="feature-link">Set this week's goal →</span>
        </Link>

        <Link to="/resources" className="feature-card">
          <div className="feature-icon" style={{background:'#FFF3CD'}}>📚</div>
          <h3>Resources</h3>
          <p>Articles, tips and guides on anxiety, sleep, stress, motivation and more</p>
          <span className="feature-link">Browse resources →</span>
        </Link>

        <Link to="/community" className="feature-card">
          <div className="feature-icon" style={{background:'#FAECE7'}}>🤝</div>
          <h3>Community Board</h3>
          <p>Share how you feel anonymously and support others with emoji reactions</p>
          <span className="feature-link">Visit community →</span>
        </Link>

      </div>
      </main>
    </div>
  )
}