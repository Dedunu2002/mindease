import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import StudentSidebar from '../components/StudentSidebar'
import SOSButton from '../components/SOSButton'

import '../styles/StudentDashboard.css'

const API = 'http://127.0.0.1:5000/api'

export default function StudentDashboard() {
  const navigate = useNavigate()

  const [streak, setStreak] = useState(0)
  const [latestCheckin, setLatestCheckin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [streakRes, checkinRes] = await Promise.all([
        fetch(`${API}/streak`, {
          credentials: 'include'
        }),
        fetch(`${API}/checkins/latest`, {
          credentials: 'include'
        })
      ])

      if (streakRes.ok) {
        const streakData = await streakRes.json()
        setStreak(streakData.streak || 0)
      }

      if (checkinRes.ok) {
        const checkinData = await checkinRes.json()
        setLatestCheckin(checkinData)
      }
    } catch (error) {
      console.error('Dashboard loading error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRiskText = () => {
    if (!latestCheckin) return 'Not yet assessed'

    return latestCheckin.risk_result ||
      latestCheckin.risk_level ||
      'Not yet assessed'
  }

  const risk = getRiskText()

  const getRiskClass = () => {
    if (risk === 'Low') return 'risk-low'
    if (risk === 'Medium') return 'risk-medium'
    if (risk === 'High') return 'risk-high'

    return 'risk-neutral'
  }

  const today = new Date()

  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="student-dashboard">

      <StudentSidebar />

      <main className="student-main">

        {/* =========================================
            HEADER
        ========================================= */}

        <header className="dashboard-header">

          <div>
            <div className="dashboard-date">
              {formattedDate}
            </div>

            <h1>
              Good evening, Ann <span>🌷</span>
            </h1>

            <p>
              Here's a gentle look at your wellbeing today.
            </p>
          </div>

          <div className="dashboard-header-actions">

            <button
              className="header-icon-button"
              aria-label="Notifications"
            >
              ♡
            </button>

            <button
              className="profile-mini"
              onClick={() => navigate('/profile')}
            >
              A
            </button>

          </div>

        </header>


        {/* =========================================
            SUMMARY STATISTICS
        ========================================= */}

        <section className="summary-grid">

          <article className="summary-card summary-yellow">

            <div className="summary-card-top">
              <div className="summary-icon">🔥</div>

              <span className="summary-label">
                WELLNESS STREAK
              </span>
            </div>

            <div className="summary-value">
              {loading ? '—' : streak}
              <span>days</span>
            </div>

            <div className="summary-footer">
              Keep going gently 🌱
            </div>

          </article>


          <article className="summary-card summary-green">

            <div className="summary-card-top">
              <div className="summary-icon">💛</div>

              <span className="summary-label">
                LATEST WELLBEING
              </span>
            </div>

            <div className={`summary-value ${getRiskClass()}`}>
              {loading ? '—' : risk}
            </div>

            <div className="summary-footer">
              {latestCheckin
                ? `Last check-in · ${latestCheckin.checkin_date || 'recently'}`
                : 'Complete your first check-in'}
            </div>

          </article>


          <article className="summary-card summary-pink">

            <div className="summary-card-top">
              <div className="summary-icon">🏅</div>

              <span className="summary-label">
                ACHIEVEMENTS
              </span>
            </div>

            <div className="summary-value">
              4
              <span>badges</span>
            </div>

            <div className="summary-footer">
              2 more to unlock ✨
            </div>

          </article>

        </section>


        {/* =========================================
            MAIN ANALYTICS AREA
        ========================================= */}

        <section className="dashboard-two-column">

          {/* Wellbeing chart placeholder */}
          <article className="dashboard-panel mood-panel">

            <div className="panel-heading">

              <div>
                <span className="panel-kicker">
                  YOUR WELLBEING
                </span>

                <h2>
                  Mood this week
                </h2>
              </div>

              <button className="panel-action">
                View insights →
              </button>

            </div>

            <div className="chart-placeholder">

              <div className="chart-y-labels">
                <span>Great</span>
                <span>Good</span>
                <span>Okay</span>
                <span>Low</span>
              </div>

              <div className="simple-chart">

                <div className="chart-line chart-line-one" />
                <div className="chart-line chart-line-two" />
                <div className="chart-line chart-line-three" />

                <div className="chart-points">
                  <span style={{ left: '8%', bottom: '45%' }}>●</span>
                  <span style={{ left: '23%', bottom: '58%' }}>●</span>
                  <span style={{ left: '39%', bottom: '51%' }}>●</span>
                  <span style={{ left: '55%', bottom: '68%' }}>●</span>
                  <span style={{ left: '71%', bottom: '62%' }}>●</span>
                  <span style={{ left: '87%', bottom: '78%' }}>●</span>
                </div>

              </div>

              <div className="chart-days">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

            </div>

            <div className="chart-note">
              Complete more check-ins to see your personal trend.
            </div>

          </article>


          {/* Calendar */}
          <MiniCalendar />

        </section>


        {/* =========================================
            QUICK ACTIONS
        ========================================= */}

        <section className="dashboard-section">

          <div className="section-heading">
            <div>
              <span className="panel-kicker">
                MAKE IT EASY
              </span>

              <h2>Quick actions</h2>
            </div>
          </div>


          <div className="quick-actions">

            <button
              className="quick-action quick-yellow"
              onClick={() => navigate('/checkin')}
            >
              <span>💛</span>

              <div>
                <strong>Daily check-in</strong>
                <small>How are you feeling?</small>
              </div>

              <b>→</b>
            </button>


            <button
              className="quick-action quick-pink"
              onClick={() => navigate('/journal')}
            >
              <span>📝</span>

              <div>
                <strong>Write a journal</strong>
                <small>Put your thoughts down</small>
              </div>

              <b>→</b>
            </button>


            <button
              className="quick-action quick-green"
              onClick={() => navigate('/exercises')}
            >
              <span>🌿</span>

              <div>
                <strong>Take a breath</strong>
                <small>Try a calming exercise</small>
              </div>

              <b>→</b>
            </button>


            <button
              className="quick-action quick-neutral"
              onClick={() => navigate('/booking')}
            >
              <span>📅</span>

              <div>
                <strong>Talk to someone</strong>
                <small>Book a counsellor</small>
              </div>

              <b>→</b>
            </button>

          </div>

        </section>


        {/* =========================================
            WELLBEING INDICATORS
        ========================================= */}

        <section className="dashboard-two-column indicators-section">

          <article className="dashboard-panel">

            <div className="panel-heading">

              <div>
                <span className="panel-kicker">
                  PERSONAL SNAPSHOT
                </span>

                <h2>Wellbeing indicators</h2>
              </div>

              <span className="small-status">
                Based on recent check-ins
              </span>

            </div>


            <div className="indicator-list">

              <Indicator
                icon="😌"
                label="Stress"
                value={40}
              />

              <Indicator
                icon="😴"
                label="Sleep"
                value={78}
              />

              <Indicator
                icon="⚡"
                label="Energy"
                value={72}
              />

              <Indicator
                icon="🏃"
                label="Activity"
                value={65}
              />

            </div>

          </article>


          <article className="reminder-panel">

            <div className="reminder-icon">
              🌿
            </div>

            <span className="panel-kicker">
              A LITTLE REMINDER
            </span>

            <h2>
              You don't need to have everything figured out today.
            </h2>

            <p>
              Take one small step at a time. Looking after yourself
              is already progress.
            </p>

            <button
              onClick={() => navigate('/exercises')}
            >
              Try a 2-minute exercise →
            </button>

          </article>

        </section>


        {/* =========================================
            RESOURCE LIBRARY
        ========================================= */}

        <section className="dashboard-section resource-section">

          <div className="section-heading">

            <div>
              <span className="panel-kicker">
                EXPLORE & LEARN
              </span>

              <h2>Recommended for you</h2>
            </div>

            <button
              className="panel-action"
              onClick={() => navigate('/resources')}
            >
              View all →
            </button>

          </div>


          <div className="resource-grid">

            <ResourceCard
              icon="🌿"
              category="BREATHING"
              title="5-minute calming breath"
              duration="5 min"
            />

            <ResourceCard
              icon="😴"
              category="SLEEP"
              title="Better sleep habits for students"
              duration="7 min"
            />

            <ResourceCard
              icon="🌸"
              category="SELF-CARE"
              title="Reset after a stressful day"
              duration="6 min"
            />

          </div>

        </section>


        {/* =========================================
            SOS
        ========================================= */}

        <SOSButton />

      </main>

    </div>
  )
}


/* =========================================
   SMALL COMPONENTS
========================================= */

function Indicator({ icon, label, value }) {
  return (
    <div className="indicator">

      <div className="indicator-heading">

        <div className="indicator-name">
          <span>{icon}</span>
          {label}
        </div>

        <strong>{value}%</strong>

      </div>

      <div className="indicator-track">
        <div
          className="indicator-progress"
          style={{ width: `${value}%` }}
        />
      </div>

    </div>
  )
}


function ResourceCard({
  icon,
  category,
  title,
  duration
}) {
  return (
    <article className="resource-card">

      <div className="resource-thumbnail">

        <span className="resource-thumbnail-icon">
          {icon}
        </span>

        <button
          className="resource-play"
          aria-label={`Play ${title}`}
        >
          ▶
        </button>

      </div>

      <div className="resource-content">

        <span className="resource-category">
          {category}
        </span>

        <h3>{title}</h3>

        <div className="resource-meta">
          <span>▶ Watch</span>
          <span>{duration}</span>
        </div>

      </div>

    </article>
  )
}


function MiniCalendar() {
  const days = [
    '', '', '', '', '',
    1, 2,
    3, 4, 5, 6, 7, 8, 9,
    10, 11, 12, 13, 14, 15, 16,
    17, 18, 19, 20, 21, 22, 23,
    24, 25, 26, 27, 28, 29, 30,
    31
  ]

  return (
    <article className="dashboard-panel calendar-panel">

      <div className="panel-heading">

        <div>
          <span className="panel-kicker">
            YOUR ROUTINE
          </span>

          <h2>August 2026</h2>
        </div>

        <div className="calendar-controls">
          <button>‹</button>
          <button>›</button>
        </div>

      </div>


      <div className="calendar-weekdays">
        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
        <span>S</span>
      </div>


      <div className="calendar-grid">

        {days.map((day, index) => (
          <div
            key={index}
            className={`calendar-day ${
              day === 20 ? 'today' : ''
            } ${
              [18, 19].includes(day)
                ? 'activity-day'
                : ''
            }`}
          >
            {day}
          </div>
        ))}

      </div>


      <div className="calendar-legend">

        <span>
          <i className="legend-dot checkin-dot" />
          Check-in
        </span>

        <span>
          <i className="legend-dot selfcare-dot" />
          Self-care
        </span>

      </div>

    </article>
  )
}