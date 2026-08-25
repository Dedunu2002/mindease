// src/pages/CounsellorDashboard.jsx
import CounsellorSidebar from '../components/CounsellorSidebar'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts'

import api from '../api/axios'

import '../styles/CounsellorDashboard.css'


// ============================================================
// COLOURS
// ============================================================

const RISK_COLOURS = {
  Good: '#78B98A',
  Moderate: '#D9B95B',
  Poor: '#D98989'
}

const CHART_COLOURS = {
  good: '#78B98A',
  moderate: '#B59AD9',
  poor: '#D98989'
}


// ============================================================
// CUSTOM PIE TOOLTIP
// ============================================================

function RiskTooltip({ active, payload }) {

  if (!active || !payload || !payload.length) {
    return null
  }

  const item = payload[0].payload

  return (
    <div className="counsellor-tooltip">

      <strong>
        {item.name}
      </strong>

      <span>
        {item.value} check-ins
      </span>

      <small>
        {item.percentage}%
      </small>

    </div>
  )
}


// ============================================================
// DASHBOARD
// ============================================================

export default function CounsellorDashboard() {

  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ==========================================================
  // COMMUNITY MODERATION
  // ==========================================================

  const [flaggedPosts, setFlaggedPosts] = useState([])
  const [moderationLoading, setModerationLoading] = useState(true)
  const [moderationError, setModerationError] = useState('')
  const [moderationActionId, setModerationActionId] = useState(null)
  const [moderationMessage, setModerationMessage] = useState('')


  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadDashboard = async () => {

    try {

      setLoading(true)
      setError('')

      const response = await api.get(
        '/counsellor/data'
      )

      setDashboard(response.data)

    } catch (err) {

      console.error(
        'Counsellor dashboard error:',
        err
      )

      setError(
        err.response?.data?.error ||
        'Unable to load dashboard data.'
      )

    } finally {

      setLoading(false)

    }
  }


  const loadModeration = async () => {
    try {
      setModerationLoading(true)
      setModerationError('')

      const response = await api.get(
        '/counsellor/community/moderation'
      )

      setFlaggedPosts(
        response.data?.posts || []
      )
    } catch (err) {
      console.error(
        'Community moderation error:',
        err
      )

      setModerationError(
        err.response?.data?.error ||
        'Unable to load flagged community posts.'
      )
    } finally {
      setModerationLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    loadModeration()
  }, [])


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = async () => {

    await logout()

    navigate('/login')
  }

  // ==========================================================
  // COMMUNITY MODERATION ACTIONS
  // ==========================================================

  const handleRestorePost = async (postId) => {
    try {
      setModerationActionId(postId)
      setModerationMessage('')

      await api.patch(
        `/counsellor/community/${postId}/restore`
      )

      setModerationMessage(
        'Post restored successfully.'
      )

      await loadModeration()
    } catch (err) {
      console.error(
        'Restore community post error:',
        err
      )

      setModerationMessage(
        err.response?.data?.error ||
        'Unable to restore the post.'
      )
    } finally {
      setModerationActionId(null)
    }
  }

  const handleRemovePost = async (postId) => {
    const confirmed = window.confirm(
      'Are you sure you want to remove this community post? This action cannot be undone.'
    )

    if (!confirmed) {
      return
    }

    try {
      setModerationActionId(postId)
      setModerationMessage('')

      await api.delete(
        `/counsellor/community/${postId}/remove`
      )

      setModerationMessage(
        'Post removed successfully.'
      )

      await loadModeration()
    } catch (err) {
      console.error(
        'Remove community post error:',
        err
      )

      setModerationMessage(
        err.response?.data?.error ||
        'Unable to remove the post.'
      )
    } finally {
      setModerationActionId(null)
    }
  }


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <div className="counsellor-loading">

        <div className="loading-spinner"></div>

        <p>
          Loading campus wellbeing analytics...
        </p>

      </div>
    )
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {

    return (
      <div className="counsellor-error-page">

        <div className="error-card">

          <span>⚠️</span>

          <h2>
            Unable to load dashboard
          </h2>

          <p>
            {error}
          </p>

          <button
            onClick={loadDashboard}
            className="retry-button"
          >
            Try Again
          </button>

        </div>

      </div>
    )
  }


  const summary =
    dashboard?.summary || {}

  const riskDistribution =
    dashboard?.risk_distribution || []

  const weeklyTrend =
    dashboard?.weekly_trend || []

  const appointments =
    dashboard?.appointments || {}

  const sosAlerts =
    dashboard?.sos_alerts || []


  // ==========================================================
  // APPOINTMENT BAR DATA
  // ==========================================================

  const appointmentChartData = [
  {
    status: 'Pending',
    count: appointments.pending || 0
  },
  {
    status: 'Confirmed',
    count: appointments.confirmed || 0
  },
  {
    status: 'Completed',
    count: appointments.completed || 0
  },
  {
    status: 'Rejected',
    count: appointments.rejected || 0
  }
]


  return (

  <div className="counsellor-layout">

  <CounsellorSidebar />

  <div className="counsellor-page">

      {/* ======================================================
          TOP HEADER
      ====================================================== */}

      <header className="counsellor-header">

        <div className="counsellor-brand">

          <div className="counsellor-brand-icon">
            🧑‍⚕️
          </div>

          <div>

            <p className="dashboard-eyebrow">
              COUNSELLOR PORTAL
            </p>

            <h1>
              Campus Wellbeing
            </h1>

          </div>

        </div>


        <div className="counsellor-header-right">

          <div className="privacy-badge">
            🔒 Anonymous analytics
          </div>

          <div className="counsellor-user">

            <div className="user-avatar">
              {currentUser?.name
                ?.charAt(0)
                ?.toUpperCase() || 'C'}
            </div>

            <div>

              <strong>
                {currentUser?.name}
              </strong>

              <span>
                Counsellor
              </span>

            </div>

          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="counsellor-main">


        {/* ====================================================
            WELCOME
        ==================================================== */}

        <section className="dashboard-intro">

          <div>

            <p className="intro-label">
              WELLBEING OVERVIEW
            </p>

            <h2>
              Welcome back, {currentUser?.name}
            </h2>

            <p>
              Monitor campus wellbeing patterns
              using anonymous aggregated data.
            </p>

          </div>

          <button
            className="refresh-button"
            onClick={loadDashboard}
          >
            ↻ Refresh data
          </button>

        </section>


        {/* ====================================================
            SUMMARY CARDS
        ==================================================== */}

        <section className="summary-grid">


          <div className="summary-card sessions-card">

            <div className="summary-icon">
              🌿
            </div>

            <div>

              <span>
                Check-ins this week
              </span>

              <strong>
                {summary.checkins_this_week || 0}
              </strong>

              <small>
                Anonymous submissions
              </small>

            </div>

          </div>


          <div className="summary-card appointments-card">

            <div className="summary-icon">
              🪻
            </div>

            <div>

              <span>
                Pending appointments
              </span>

              <strong>
                {summary.pending_appointments || 0}
              </strong>

              <small>
                Awaiting action
              </small>

            </div>

          </div>


          <div className="summary-card progress-card">

            <div className="summary-icon">
              🩵
            </div>

            <div>

              <span>
                Good wellbeing
              </span>

              <strong>
                {summary.good_percentage || 0}%
              </strong>

              <small>
                Current week
              </small>

            </div>

          </div>


          <div className="summary-card sos-card">

            <div className="summary-icon">
              🆘
            </div>

            <div>

              <span>
                SOS alerts
              </span>

              <strong>
                {summary.sos_this_week || 0}
              </strong>

              <small>
                This week
              </small>

            </div>

          </div>


        </section>


        {/* ====================================================
            CHARTS ROW 1
        ==================================================== */}

        <section className="analytics-grid">


          {/* ==================================================
              DOUGHNUT
          ================================================== */}

          <article className="analytics-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  CURRENT WEEK
                </span>

                <h3>
                  Risk distribution
                </h3>

              </div>

              <span className="card-icon">
                ◔
              </span>

            </div>


            <div className="donut-container">

              <ResponsiveContainer
                width="100%"
                height={280}
              >

                <PieChart>

                  <Pie
                    data={riskDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={78}
                    outerRadius={108}
                    paddingAngle={4}
                    stroke="none"
                  >

                    {riskDistribution.map(
                      (entry, index) => (

                        <Cell
                          key={`risk-${index}`}
                          fill={
                            RISK_COLOURS[
                              entry.name
                            ]
                          }
                        />

                      )
                    )}

                  </Pie>

                  <Tooltip
                    content={<RiskTooltip />}
                  />

                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                  />

                </PieChart>

              </ResponsiveContainer>


              <div className="donut-center">

                <strong>
                  {summary.good_percentage || 0}%
                </strong>

                <span>
                  Good
                </span>

              </div>

            </div>

          </article>


          {/* ==================================================
              LINE CHART
          ================================================== */}

          <article className="analytics-card wide-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  8-WEEK OVERVIEW
                </span>

                <h3>
                  Wellbeing risk trend
                </h3>

              </div>

              <span className="card-icon">
                📈
              </span>

            </div>


            <div className="chart-area">

              <ResponsiveContainer
                width="100%"
                height={280}
              >

                <LineChart
                  data={weeklyTrend}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 5
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E9E5EF"
                  />

                  <XAxis
                    dataKey="week"
                    tick={{
                      fontSize: 11,
                      fill: '#77717F'
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 11,
                      fill: '#77717F'
                    }}
                  />

                  <Tooltip />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="good"
                    name="Good"
                    stroke={CHART_COLOURS.good}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="moderate"
                    name="Moderate"
                    stroke={CHART_COLOURS.moderate}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="poor"
                    name="Poor"
                    stroke={CHART_COLOURS.poor}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </article>


        </section>


        {/* ====================================================
            WEEKLY BAR CHART
        ==================================================== */}

        <section className="analytics-card full-card">

          <div className="card-heading">

            <div>

              <span className="card-kicker">
                PARTICIPATION
              </span>

              <h3>
                Weekly check-in activity
              </h3>

              <p>
                Number of anonymous wellbeing
                check-ins submitted each week.
              </p>

            </div>

            <span className="card-icon">
              📊
            </span>

          </div>


          <ResponsiveContainer
            width="100%"
            height={300}
          >

            <BarChart
  data={appointmentChartData}
  layout="vertical"
>
  <CartesianGrid
    strokeDasharray="3 3"
  />

  <XAxis
    type="number"
    allowDecimals={false}
  />

  <YAxis
    type="category"
    dataKey="status"
  />

  <Tooltip />

  <Bar
    dataKey="count"
    name="Appointments"
    fill="#B59AD9"
    radius={[0, 7, 7, 0]}
  />
</BarChart>

          </ResponsiveContainer>

        </section>


        {/* ====================================================
            BOTTOM ANALYTICS
        ==================================================== */}

        <section className="bottom-grid">


          {/* ==================================================
              APPOINTMENT CHART
          ================================================== */}

          <article className="analytics-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  APPOINTMENTS
                </span>

                <h3>
                  Appointment overview
                </h3>

              </div>

              <span className="card-icon">
                🪻
              </span>

            </div>


            <ResponsiveContainer
              width="100%"
              height={260}
            >

              <BarChart
                data={appointmentChartData}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 10
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E9E5EF"
                />

                <XAxis
                  type="number"
                  allowDecimals={false}
                />

                <YAxis
                  type="category"
                  dataKey="status"
                  width={80}
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  name="Appointments"
                  fill="#B59AD9"
                  radius={[0, 7, 7, 0]}
                  barSize={25}
                />

              </BarChart>

            </ResponsiveContainer>

          </article>


          {/* ==================================================
              SOS ALERTS
          ================================================== */}

          <article className="analytics-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  THIS WEEK
                </span>

                <h3>
                  SOS alerts
                </h3>

              </div>

              <span className="card-icon sos-heading-icon">
                🆘
              </span>

            </div>


            {sosAlerts.length === 0 ? (

              <div className="empty-sos">

                <div>
                  ✓
                </div>

                <h4>
                  No SOS alerts
                </h4>

                <p>
                  No anonymous SOS activations
                  have been recorded this week.
                </p>

              </div>

            ) : (

              <div className="sos-list">

                {sosAlerts
                  .slice(0, 6)
                  .map(alert => {

                    const alertDate =
                      new Date(
                        alert.created_at
                      )

                    return (

                      <div
                        className="sos-item"
                        key={alert.id}
                      >

                        <div className="sos-dot">
                          !
                        </div>

                        <div>

                          <strong>
                            Anonymous SOS activation
                          </strong>

                          <span>
                            {alertDate.toLocaleDateString(
                              undefined,
                              {
                                day: '2-digit',
                                month: 'short'
                              }
                            )}

                            {' · '}

                            {alertDate.toLocaleTimeString(
                              undefined,
                              {
                                hour: '2-digit',
                                minute: '2-digit'
                              }
                            )}
                          </span>

                        </div>

                      </div>

                    )
                  })}

              </div>

            )}

          </article>


        </section>


        {/* ====================================================
            COMMUNITY MODERATION
        ==================================================== */}

        <section className="moderation-section">

          <div className="moderation-header">

            <div>
              <span className="card-kicker">
                COMMUNITY SAFETY
              </span>

              <h3>
                Community moderation
              </h3>

              <p>
                Review community posts that have been
                flagged for counsellor attention.
              </p>
            </div>

            <div className="moderation-header-right">

              <span className="moderation-count">
                {flaggedPosts.length}{' '}
                {flaggedPosts.length === 1
                  ? 'pending review'
                  : 'pending reviews'}
              </span>

              <button
                type="button"
                className="moderation-refresh"
                onClick={loadModeration}
                disabled={moderationLoading}
              >
                ↻ Refresh
              </button>

            </div>

          </div>


          {moderationMessage && (
            <div
              className={
                moderationMessage.includes('successfully')
                  ? 'moderation-feedback success'
                  : 'moderation-feedback error'
              }
            >
              <span>
                {moderationMessage.includes('successfully')
                  ? '✓'
                  : '⚠️'}
              </span>

              {moderationMessage}
            </div>
          )}


          {moderationLoading ? (

            <div className="moderation-empty">
              <div className="moderation-spinner"></div>

              <p>
                Loading flagged posts...
              </p>
            </div>

          ) : moderationError ? (

            <div className="moderation-empty moderation-error-state">

              <div className="moderation-empty-icon">
                ⚠️
              </div>

              <h4>
                Unable to load moderation queue
              </h4>

              <p>
                {moderationError}
              </p>

              <button
                type="button"
                className="moderation-retry-button"
                onClick={loadModeration}
              >
                Try Again
              </button>

            </div>

          ) : flaggedPosts.length === 0 ? (

            <div className="moderation-empty">

              <div className="moderation-empty-icon safe">
                ✓
              </div>

              <h4>
                No posts waiting for review
              </h4>

              <p>
                Flagged community posts will appear here
                when students report them.
              </p>

            </div>

          ) : (

            <div className="moderation-list">

              {flaggedPosts.map(post => {

                const postDate = post.created_at
                  ? new Date(post.created_at)
                  : null

                const formattedDate =
                  postDate && !Number.isNaN(postDate.getTime())
                    ? postDate.toLocaleDateString(
                        undefined,
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }
                      )
                    : 'Recently'

                const formattedTime =
                  postDate && !Number.isNaN(postDate.getTime())
                    ? postDate.toLocaleTimeString(
                        undefined,
                        {
                          hour: '2-digit',
                          minute: '2-digit'
                        }
                      )
                    : ''

                const isActing =
                  moderationActionId === post.id

                return (
                  <article
                    className="moderation-post"
                    key={post.id}
                  >

                    <div className="moderation-post-top">

                      <div className="moderation-post-author">

                        <div className="moderation-author-icon">
                          👤
                        </div>

                        <div>
                          <strong>
                            Anonymous Student
                          </strong>

                          <span>
                            {formattedDate}
                            {formattedTime
                              ? ` · ${formattedTime}`
                              : ''}
                          </span>
                        </div>

                      </div>

                      <span className="moderation-status">
                        ⚠ Flagged
                      </span>

                    </div>


                    <div className="moderation-content">
                      {post.content}
                    </div>


                    <div className="moderation-post-footer">

                      <span className="moderation-privacy">
                        🔒 Student identity protected
                      </span>

                      <div className="moderation-actions">

                        <button
                          type="button"
                          className="restore-post-button"
                          onClick={() =>
                            handleRestorePost(post.id)
                          }
                          disabled={isActing}
                        >
                          {isActing
                            ? 'Processing...'
                            : '✓ Restore Post'}
                        </button>

                        <button
                          type="button"
                          className="remove-post-button"
                          onClick={() =>
                            handleRemovePost(post.id)
                          }
                          disabled={isActing}
                        >
                          {isActing
                            ? 'Processing...'
                            : 'Remove Post'}
                        </button>

                      </div>

                    </div>

                  </article>
                )
              })}

            </div>
          )}

        </section>


        {/* ====================================================
            PRIVACY NOTE
        ==================================================== */}

        <div className="privacy-notice">

          <span>
            🔒
          </span>

          <div>

            <strong>
              Privacy protected analytics
            </strong>

            <p>
              Dashboard charts show aggregated campus
              statistics only. Individual student check-in
              responses and identities are not displayed.
            </p>

          </div>

        </div>


      </main>

    </div>
    </div>
  )
}