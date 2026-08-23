import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import StudentSidebar from '../components/StudentSidebar'
import SOSButton from '../components/SOSButton'

import '../styles/StudentDashboard.css'

const API = 'http://localhost:5000/api'
export default function StudentDashboard() {
  const navigate = useNavigate()

  const [streak, setStreak] = useState(0)
const [latestCheckin, setLatestCheckin] = useState(null)
const [checkinHistory, setCheckinHistory] = useState([])
const [badges, setBadges] = useState([])
const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
  try {
    const [streakRes, latestRes, historyRes] = await Promise.all([
      fetch(`${API}/streak`, {
        credentials: 'include'
      }),

      fetch(`${API}/checkins/latest`, {
        credentials: 'include'
      }),

      fetch(`${API}/checkins/history`, {
        credentials: 'include'
      })
    ])

    if (streakRes.ok) {
  const streakData = await streakRes.json()

  setStreak(streakData.current_streak || 0)
  setBadges(streakData.badges || [])
}

    if (latestRes.ok) {
      const latestData = await latestRes.json()
      setLatestCheckin(latestData.checkin || null)
    }

    if (historyRes.ok) {
      const historyData = await historyRes.json()
      setCheckinHistory(historyData.checkins || [])
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
  const getIndicatorValue = (field, defaultValue = 0) => {
  if (!latestCheckin) return defaultValue

  const value = Number(latestCheckin[field])

  if (Number.isNaN(value)) {
    return defaultValue
  }

  return value
}

const stress = getIndicatorValue('stress_level')
const sleep = getIndicatorValue('sleep_hours')
const activity = getIndicatorValue('physical_activity')
const socialSupport = getIndicatorValue('social_support')

// Convert the latest check-in values into dashboard percentages
const stressPercentage = Math.min(
  100,
  Math.round((stress / 5) * 100)
)

const sleepPercentage = Math.min(
  100,
  Math.round((sleep / 8) * 100)
)

const activityPercentage = Math.min(
  100,
  Math.round((activity / 7) * 100)
)

const socialPercentage = Math.min(
  100,
  Math.round((socialSupport / 10) * 100)
)
  return (
    <div className="student-dashboard">

      

      <div className="student-dashboard">

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
  {loading ? '—' : badges.length}
  <span>badges</span>
</div>

<div className="summary-footer">
  {6 - badges.length > 0
    ? `${6 - badges.length} more to unlock ✨`
    : 'All badges unlocked 🎉'}
</div>

          </article>

        </section>


        {/* =========================================
            MAIN ANALYTICS AREA
        ========================================= */}

        <section className="dashboard-two-column">

          {/* Wellbeing chart placeholder */}
          <WellbeingTrendChart checkinHistory={checkinHistory} />


          {/* Calendar */}
          <MiniCalendar checkinHistory={checkinHistory} />

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
  value={stressPercentage}
  displayValue={`${stress}/5`}
  inverse
/>

<Indicator
  icon="😴"
  label="Sleep"
  value={sleepPercentage}
  displayValue={`${sleep} hrs`}
/>

<Indicator
  icon="🏃"
  label="Physical activity"
  value={activityPercentage}
  displayValue={`${activity}/7`}
/>

<Indicator
  icon="🤝"
  label="Social support"
  value={socialPercentage}
  displayValue={`${socialSupport}/10`}
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

      </div>

    </div>
  )
}


/* =========================================
   SMALL COMPONENTS
========================================= */

function Indicator({
  icon,
  label,
  value,
  displayValue,
  inverse = false
}) {
  const progressWidth = inverse
    ? 100 - value
    : value

  return (
    <div className="indicator">

      <div className="indicator-heading">

        <div className="indicator-name">
          <span>{icon}</span>
          {label}
        </div>

        <strong>{displayValue}</strong>

      </div>

      <div className="indicator-track">

        <div
          className={`indicator-progress ${
            inverse ? 'indicator-inverse' : ''
          }`}
          style={{
            width: `${progressWidth}%`
          }}
        />

      </div>

    </div>
  )
}

function WellbeingTrendChart({ checkinHistory }) {

  // ----------------------------------------------------------
  // Get the last 7 days
  // ----------------------------------------------------------

  const today = new Date()

  today.setHours(0, 0, 0, 0)

  const sevenDaysAgo = new Date(today)

  sevenDaysAgo.setDate(
    today.getDate() - 6
  )


  // ----------------------------------------------------------
  // Filter check-ins to the current 7-day period
  // ----------------------------------------------------------

  const weekCheckins = checkinHistory
    .filter(item => {

      if (!item.date) return false

      const date = new Date(`${item.date}T00:00:00`)

      return (
        date >= sevenDaysAgo &&
        date <= today
      )

    })
    .sort((a, b) => {

      return new Date(`${a.date}T00:00:00`) -
             new Date(`${b.date}T00:00:00`)

    })


  // ----------------------------------------------------------
  // Create chart points
  //
  // Stress:
  // 1 = very low stress
  // 5 = very high stress
  // ----------------------------------------------------------

  const chartWidth = 700
  const chartHeight = 280

  const paddingLeft = 50
  const paddingRight = 20
  const paddingTop = 25
  const paddingBottom = 45

  const graphWidth =
    chartWidth - paddingLeft - paddingRight

  const graphHeight =
    chartHeight - paddingTop - paddingBottom


  const getX = (index) => {

    if (weekCheckins.length === 1) {
      return chartWidth / 2
    }

    return (
      paddingLeft +
      (index / (weekCheckins.length - 1)) *
      graphWidth
    )

  }


  const getY = (stress) => {

    return (
      paddingTop +
      ((5 - stress) / 4) *
      graphHeight
    )

  }


  // ----------------------------------------------------------
  // Create SVG path
  // ----------------------------------------------------------

  const points = weekCheckins.map(
    (item, index) => {

      const stress =
        Math.min(
          5,
          Math.max(
            1,
            Number(item.stress_level) || 1
          )
        )

      return {
        x: getX(index),
        y: getY(stress),
        stress,
        date: item.date,
        id: item.id
      }

    }
  )


  const linePath = points.length > 1
    ? points
        .map((point, index) => {

          return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`

        })
        .join(' ')
    : ''


  // ----------------------------------------------------------
  // Friendly status message
  // ----------------------------------------------------------

  let trendMessage =
    'Complete a check-in to begin your wellbeing trend.'

  if (weekCheckins.length === 1) {

    trendMessage =
      'One check-in recorded this week. Keep checking in gently 🌱'

  } else if (weekCheckins.length > 1) {

    const first =
      points[0].stress

    const last =
      points[points.length - 1].stress

    if (last < first) {

      trendMessage =
        'Your stress appears to be easing this week 🌿'

    } else if (last > first) {

      trendMessage =
        'Your stress has increased recently. Be gentle with yourself 💛'

    } else {

      trendMessage =
        'Your stress level has remained fairly steady this week 🌸'

    }

  }


  return (

    <article className="dashboard-panel mood-panel">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="panel-heading">

        <div>

          <span className="panel-kicker">
            YOUR WELLBEING
          </span>

          <h2>
            Wellbeing this week
          </h2>

        </div>


        <button
          className="panel-action"
          type="button"
        >
          View insights →
        </button>

      </div>


      {/* ====================================================
          CHART
      ==================================================== */}

      <div className="wellbeing-chart">

        {weekCheckins.length === 0 ? (

          <div className="chart-empty-state">

            <div className="chart-empty-icon">
              🌱
            </div>

            <h3>
              Your week starts here
            </h3>

            <p>
              Complete a daily check-in to see
              your wellbeing trend.
            </p>

          </div>

        ) : (

          <div className="chart-svg-wrapper">

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              className="wellbeing-svg"
              role="img"
              aria-label="Weekly wellbeing stress trend"
            >

              {/* ==========================================
                  HORIZONTAL GRID LINES
              ========================================== */}

              {[1, 2, 3, 4, 5].map(level => {

                const y = getY(level)

                return (
                  <line
                    key={level}
                    x1={paddingLeft}
                    x2={chartWidth - paddingRight}
                    y1={y}
                    y2={y}
                    className="chart-grid-line"
                  />
                )

              })}


              {/* ==========================================
                  AREA UNDER LINE
              ========================================== */}

              {points.length > 1 && (

                <path
                  d={`
                    ${linePath}
                    L ${points[points.length - 1].x}
                      ${chartHeight - paddingBottom}
                    L ${points[0].x}
                      ${chartHeight - paddingBottom}
                    Z
                  `}
                  className="chart-area"
                />

              )}


              {/* ==========================================
                  MAIN LINE
              ========================================== */}

              {points.length > 1 && (

                <path
                  d={linePath}
                  className="chart-main-line"
                />

              )}


              {/* ==========================================
                  DATA POINTS
              ========================================== */}

              {points.map(point => (

                <g key={point.id}>

                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="7"
                    className="chart-point-halo"
                  />

                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    className="chart-point"
                  />

                  <title>
                    {point.date} · Stress {point.stress}/5
                  </title>

                </g>

              ))}


              {/* ==========================================
                  Y-AXIS LABELS
              ========================================== */}

              <text
                x="5"
                y={getY(5) + 5}
                className="chart-axis-label"
              >
                High
              </text>

              <text
                x="5"
                y={getY(3) + 5}
                className="chart-axis-label"
              >
                Moderate
              </text>

              <text
                x="5"
                y={getY(1) + 5}
                className="chart-axis-label"
              >
                Low
              </text>


              {/* ==========================================
                  X-AXIS DATES
              ========================================== */}

              {points.map(point => (

                <text
                  key={`date-${point.id}`}
                  x={point.x}
                  y={chartHeight - 12}
                  textAnchor="middle"
                  className="chart-date-label"
                >
                  {new Date(
                    `${point.date}T00:00:00`
                  ).toLocaleDateString(
                    'en-US',
                    {
                      weekday: 'short'
                    }
                  )}
                </text>

              ))}

            </svg>

          </div>

        )}

      </div>


      {/* ====================================================
          FOOTER
      ==================================================== */}

      <div className="chart-note">

        <span>
          {trendMessage}
        </span>

        <span className="chart-count">

          {weekCheckins.length}
          {' '}
          {weekCheckins.length === 1
            ? 'check-in'
            : 'check-ins'}

        </span>

      </div>

    </article>

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


function MiniCalendar({ checkinHistory }) {

  const today = new Date()

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  )

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // ----------------------------------------------------------
  // Month information
  // ----------------------------------------------------------

  const monthName = currentMonth.toLocaleString('default', {
    month: 'long'
  })

  const firstDay = new Date(year, month, 1).getDay()

  // Convert Sunday-first JS format to Monday-first calendar
  const mondayFirstOffset = firstDay === 0 ? 6 : firstDay - 1

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate()


  // ----------------------------------------------------------
  // Create calendar cells
  // ----------------------------------------------------------

  const calendarDays = []

  for (let i = 0; i < mondayFirstOffset; i++) {
    calendarDays.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }


  // ----------------------------------------------------------
  // Real check-in dates from backend
  // ----------------------------------------------------------

  const checkinDates = new Set(
    checkinHistory
      .map(item => item.date)
      .filter(Boolean)
  )


  // ----------------------------------------------------------
  // Format date as YYYY-MM-DD
  // ----------------------------------------------------------

  const formatDate = (day) => {

    const monthNumber = String(month + 1).padStart(2, '0')
    const dayNumber = String(day).padStart(2, '0')

    return `${year}-${monthNumber}-${dayNumber}`
  }


  // ----------------------------------------------------------
  // Check today's date
  // ----------------------------------------------------------

  const isToday = (day) => {

    if (!day) return false

    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    )
  }


  // ----------------------------------------------------------
  // Previous month
  // ----------------------------------------------------------

  const goToPreviousMonth = () => {

    setCurrentMonth(
      new Date(year, month - 1, 1)
    )
  }


  // ----------------------------------------------------------
  // Next month
  // ----------------------------------------------------------

  const goToNextMonth = () => {

    setCurrentMonth(
      new Date(year, month + 1, 1)
    )
  }


  return (

    <article className="dashboard-panel calendar-panel">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="panel-heading">

        <div>

          <span className="panel-kicker">
            YOUR ROUTINE
          </span>

          <h2>
            {monthName} {year}
          </h2>

        </div>


        <div className="calendar-controls">

          <button
            type="button"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            ›
          </button>

        </div>

      </div>


      {/* =====================================================
          WEEKDAYS
      ===================================================== */}

      <div className="calendar-weekdays">

        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
        <span>S</span>

      </div>


      {/* =====================================================
          CALENDAR
      ===================================================== */}

      <div className="calendar-grid">

        {calendarDays.map((day, index) => {

          if (!day) {

            return (
              <div
                key={`empty-${index}`}
                className="calendar-day empty"
              />
            )

          }


          const dateString = formatDate(day)

          const hasCheckin =
            checkinDates.has(dateString)


          return (

            <div
              key={dateString}
              className={`
                calendar-day
                ${isToday(day) ? 'today' : ''}
                ${hasCheckin ? 'activity-day' : ''}
              `}
              title={
                hasCheckin
                  ? `${dateString} · Check-in completed`
                  : dateString
              }
            >

              <span className="calendar-day-number">
                {day}
              </span>


              {/* Real check-in indicator */}

              {hasCheckin && (
                <span
                  className="calendar-activity-dot checkin-dot"
                  aria-label="Check-in completed"
                />
              )}

            </div>

          )

        })}

      </div>


      {/* =====================================================
          LEGEND
      ===================================================== */}

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