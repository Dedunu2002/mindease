import { useEffect, useRef, useState } from 'react'
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
const [currentUser, setCurrentUser] = useState(null)
const [loading, setLoading] = useState(true)
const [recommendedResources, setRecommendedResources] = useState([])
const [moodHistory, setMoodHistory] = useState([])
const [recommendationInfo, setRecommendationInfo] = useState(null)
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(false)
  const [weeklyDigestLoading, setWeeklyDigestLoading] = useState(true)
  const [weeklyDigestSaving, setWeeklyDigestSaving] = useState(false)
  const [weeklyDigestTesting, setWeeklyDigestTesting] = useState(false)
  const [weeklyDigestMessage, setWeeklyDigestMessage] = useState('')
  const [weeklyDigestError, setWeeklyDigestError] = useState('')

  const [notifications, setNotifications] = useState([])
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const notificationRef = useRef(null)


  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const loadDashboardData = async () => {
  try {
    const [meRes, streakRes, latestRes, historyRes, recommendedRes, moodRes, digestRes, notificationsRes] = await Promise.all([
      fetch(`${API}/me`, {
    credentials: 'include'
     }),
      fetch(`${API}/streak`, {
        credentials: 'include'
      }),

      fetch(`${API}/checkins/latest`, {
        credentials: 'include'
      }),

      fetch(`${API}/checkins/history`, {
        credentials: 'include'
      }),

      fetch(`${API}/resources/recommended`, {
        credentials: 'include'
      }),

      fetch(`${API}/sentiment-data?days=30`, {
        credentials: 'include'
      }),

      fetch(`${API}/weekly-digest`, {
        credentials: 'include'
      }),

      fetch(`${API}/notifications`, {
        credentials: 'include'
      })
    ])
    if (meRes.ok) {
      const userData = await meRes.json()
      setCurrentUser(userData)
    }

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

    if (recommendedRes.ok) {
      const recommendationData = await recommendedRes.json()
      setRecommendedResources(recommendationData.recommendations || [])
      setRecommendationInfo(recommendationData)
    }

    if (moodRes.ok) {
      const moodData = await moodRes.json()
      setMoodHistory(Array.isArray(moodData) ? moodData : [])
    }

    if (digestRes.ok) {
      const digestData = await digestRes.json()
      setWeeklyDigestEnabled(Boolean(digestData.enabled))
    }

    if (notificationsRes.ok) {
      const notificationData = await notificationsRes.json()
      setNotifications(notificationData.notifications || [])
      setUnreadNotificationCount(notificationData.unread_count || 0)
    }

    setWeeklyDigestLoading(false)

  } catch (error) {
    setWeeklyDigestLoading(false)
    console.error('Dashboard loading error:', error)
  } finally {
    setLoading(false)
  }
}

  const updateWeeklyDigest = async (enabled) => {
    setWeeklyDigestSaving(true)
    setWeeklyDigestMessage('')
    setWeeklyDigestError('')

    try {
      const response = await fetch(`${API}/weekly-digest`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not update weekly digest.'
        )
      }

      setWeeklyDigestEnabled(Boolean(data.enabled))

      setWeeklyDigestMessage(
        data.enabled
          ? 'Weekly digest enabled.'
          : 'Weekly digest turned off.'
      )
    } catch (error) {
      console.error('Weekly digest update error:', error)
      setWeeklyDigestError(
        error.message || 'Could not update weekly digest.'
      )
    } finally {
      setWeeklyDigestSaving(false)
    }
  }

  const sendWeeklyDigestTest = async () => {
    setWeeklyDigestTesting(true)
    setWeeklyDigestMessage('')
    setWeeklyDigestError('')

    try {
      const response = await fetch(`${API}/weekly-digest/test`, {
        method: 'POST',
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not send test email.'
        )
      }

      setWeeklyDigestMessage(
        data.message || 'Test digest sent successfully.'
      )
    } catch (error) {
      console.error('Weekly digest test error:', error)
      setWeeklyDigestError(
        error.message || 'Could not send test email.'
      )
    } finally {
      setWeeklyDigestTesting(false)
    }
  }


  const loadNotifications = async () => {
    setNotificationLoading(true)

    try {
      const response = await fetch(`${API}/notifications`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Could not load notifications.')
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadNotificationCount(data.unread_count || 0)
    } catch (error) {
      console.error('Notification loading error:', error)
    } finally {
      setNotificationLoading(false)
    }
  }

  const markNotificationRead = async (notificationId) => {
    try {
      const response = await fetch(
        `${API}/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          credentials: 'include'
        }
      )

      if (!response.ok) return

      setNotifications(previous =>
        previous.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      )

      setUnreadNotificationCount(count => Math.max(0, count - 1))
    } catch (error) {
      console.error('Mark notification read error:', error)
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      const response = await fetch(`${API}/notifications/read-all`, {
        method: 'PUT',
        credentials: 'include'
      })

      if (!response.ok) return

      setNotifications(previous =>
        previous.map(notification => ({
          ...notification,
          is_read: true
        }))
      )
      setUnreadNotificationCount(0)
    } catch (error) {
      console.error('Mark all notifications read error:', error)
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(
        `${API}/notifications/${notificationId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      )

      if (!response.ok) return

      setNotifications(previous =>
        previous.filter(notification => notification.id !== notificationId)
      )

      setUnreadNotificationCount(count => {
        const deleted = notifications.find(
          notification => notification.id === notificationId
        )
        return deleted?.is_read ? count : Math.max(0, count - 1)
      })
    } catch (error) {
      console.error('Delete notification error:', error)
    }
  }

  const formatNotificationTime = (value) => {
    if (!value) return ''

    const notificationDate = new Date(value)
    const now = new Date()
    const seconds = Math.floor((now - notificationDate) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) === 1 ? '' : 's'} ago`

    return notificationDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getNotificationIcon = (type) => {
    const icons = {
      welcome: '🌱',
      appointment: '📅',
      resource: '📚',
      goal: '🌟',
      community: '💬',
      wellbeing: '💛',
      digest: '✉️',
      general: '🔔'
    }

    return icons[type] || icons.general
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
  const getGreeting = () => {
  const hour = today.getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const displayName =
  currentUser?.name?.trim() || 'there'

const firstName =
  displayName.split(' ')[0]

const userInitial =
  displayName
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

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

      

      

        {/* =========================================
            HEADER
        ========================================= */}

        <header className="dashboard-header">

  <div className="dashboard-welcome">

    <div className="dashboard-date">
      {formattedDate}
    </div>

    <div className="dashboard-greeting-row">

      <div className="welcome-text">

        <h1>
          {getGreeting()},{' '}
          <span className="student-name">
            {firstName}
          </span>{' '}
          <span className="welcome-flower">🌷</span>
        </h1>

        <p>
          Here's a gentle look at your wellbeing today.
        </p>

      </div>

    </div>

  </div>


  <div className="dashboard-header-actions">

    <div className="notification-center" ref={notificationRef}>
      <button
        className={`header-icon-button ${notificationOpen ? 'is-open' : ''}`}
        aria-label="Notifications"
        aria-expanded={notificationOpen}
        type="button"
        onClick={() => {
          const nextOpen = !notificationOpen
          setNotificationOpen(nextOpen)
          if (nextOpen) loadNotifications()
        }}
      >
        ♡
        {unreadNotificationCount > 0 && (
          <span className="notification-dot">
            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {notificationOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <div>
              <span className="notification-kicker">YOUR UPDATES</span>
              <h3>Notifications</h3>
            </div>

            <button
              type="button"
              className="notification-mark-all"
              onClick={markAllNotificationsRead}
              disabled={unreadNotificationCount === 0}
            >
              Mark all read
            </button>
          </div>

          <div className="notification-list">
            {notificationLoading ? (
              <div className="notification-empty">
                <span className="notification-empty-icon">🌿</span>
                <p>Loading your updates...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <span className="notification-empty-icon">🌷</span>
                <h4>You're all caught up</h4>
                <p>Important MindEase updates will appear here.</p>
              </div>
            ) : (
              notifications.map(notification => (
                <article
                  key={notification.id}
                  className={`notification-item ${
                    notification.is_read ? 'is-read' : 'is-unread'
                  }`}
                  onClick={() => {
                    if (!notification.is_read) {
                      markNotificationRead(notification.id)
                    }
                  }}
                >
                  <div className="notification-item-icon">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-item-content">
                    <div className="notification-item-topline">
                      <h4>{notification.title}</h4>
                      {!notification.is_read && (
                        <span className="notification-unread-indicator" />
                      )}
                    </div>

                    <p>{notification.message}</p>

                    <div className="notification-item-footer">
                      <span>{formatNotificationTime(notification.created_at)}</span>

                      <button
                        type="button"
                        className="notification-delete"
                        aria-label={`Delete ${notification.title}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </div>

    <button
      className="profile-mini"
      onClick={() => navigate('/profile')}
      aria-label="Open profile"
      type="button"
    >
      {userInitial || 'U'}
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
            30-DAY MOOD HISTORY
        ========================================= */}

        <section className="dashboard-section mood-history-section">

          <MoodHistoryChart moodHistory={moodHistory} />

        </section>


        {/* =========================================
            WEEKLY EMAIL DIGEST
        ========================================= */}

        <section className="dashboard-section weekly-digest-section">

          <article className="weekly-digest-card">

            <div className="weekly-digest-main">

              <div className="weekly-digest-icon" aria-hidden="true">
                ✉️
              </div>

              <div className="weekly-digest-copy">

                <span className="panel-kicker">
                  GENTLE WEEKLY SUPPORT
                </span>

                <h2>Weekly wellbeing digest</h2>

                <p>
                  Get a simple summary of your wellbeing activity,
                  mood pattern, streak and helpful resources once a week.
                </p>

                <div className="weekly-digest-features">
                  <span>✓ Check-in activity</span>
                  <span>✓ Mood pattern</span>
                  <span>✓ Wellness streak</span>
                  <span>✓ Helpful resources</span>
                </div>

              </div>

            </div>

            <div className="weekly-digest-side">

              <div className="weekly-digest-email">
                <span>Send to</span>
                <strong>
                  {currentUser?.email || 'Your registered email'}
                </strong>
              </div>

              <div className="weekly-digest-toggle-row">

                <div>
                  <strong>
                    {weeklyDigestEnabled ? 'Digest is on' : 'Digest is off'}
                  </strong>

                  <small>
                    Every Sunday morning
                  </small>
                </div>

                <button
                  type="button"
                  className={`digest-toggle ${
                    weeklyDigestEnabled ? 'is-on' : ''
                  }`}
                  onClick={() =>
                    updateWeeklyDigest(!weeklyDigestEnabled)
                  }
                  disabled={
                    weeklyDigestLoading ||
                    weeklyDigestSaving
                  }
                  aria-label={
                    weeklyDigestEnabled
                      ? 'Turn weekly email digest off'
                      : 'Turn weekly email digest on'
                  }
                  aria-pressed={weeklyDigestEnabled}
                >
                  <span className="digest-toggle-knob" />
                </button>

              </div>

              <button
                type="button"
                className="weekly-digest-test"
                onClick={sendWeeklyDigestTest}
                disabled={
                  weeklyDigestTesting ||
                  weeklyDigestSaving
                }
              >
                {weeklyDigestTesting
                  ? 'Sending test email...'
                  : 'Send a test email'}

                <span>→</span>
              </button>

            </div>

            {(weeklyDigestMessage || weeklyDigestError) && (
              <div
                className={`weekly-digest-status ${
                  weeklyDigestError
                    ? 'is-error'
                    : 'is-success'
                }`}
                role="status"
              >
                <span>
                  {weeklyDigestError ? '!' : '✓'}
                </span>

                {weeklyDigestError || weeklyDigestMessage}
              </div>
            )}

          </article>

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

              <p className="resource-section-subtitle">
                {recommendationInfo?.has_checkin
                  ? 'Personalized from your latest wellbeing check-in.'
                  : 'Complete a check-in to receive resources chosen for you.'}
              </p>
            </div>

            <button
              className="panel-action"
              onClick={() => navigate('/resources')}
            >
              View all →
            </button>

          </div>

          {recommendedResources.length > 0 ? (

            <div className="resource-grid">

              {recommendedResources.slice(0, 3).map((resource) => (
                <ResourceCard
                  key={resource.id}
                  icon={resource.icon || '🌿'}
                  category={(resource.category || 'WELLNESS').toUpperCase()}
                  title={resource.title}
                  description={resource.description}
                  duration={resource.type === 'video' ? 'Watch video' : 'Read article'}
                  isVideo={resource.type === 'video'}
                  onClick={() => navigate('/resources')}
                />
              ))}

            </div>

          ) : (

            <div className="resource-empty-state">

              <div className="resource-empty-icon">
                🌱
              </div>

              <div>
                <h3>
                  {recommendationInfo?.has_checkin
                    ? 'Your resources are being prepared'
                    : 'Start with a wellbeing check-in'}
                </h3>

                <p>
                  {recommendationInfo?.has_checkin
                    ? 'Visit the Resources page to explore wellness guides and exercises.'
                    : 'A check-in helps MindEase understand what kind of support may be most useful for you.'}
                </p>
              </div>

              <button
                type="button"
                className="resource-empty-action"
                onClick={() => navigate(
                  recommendationInfo?.has_checkin
                    ? '/resources'
                    : '/checkin'
                )}
              >
                {recommendationInfo?.has_checkin
                  ? 'Explore resources →'
                  : 'Complete check-in →'}
              </button>

            </div>

          )}

        </section>


        {/* =========================================
            SOS
        ========================================= */}

        <SOSButton />

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

function MoodHistoryChart({ moodHistory }) {

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build exactly the last 30 calendar days.
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (29 - index))
    return date
  })

  const moodMap = new Map(
    moodHistory.map(item => [item.date, item])
  )

  const getMoodLevel = (item) => {
    if (!item) return null

    const group = String(
      item.mood_group ||
      item.emotion ||
      ''
    ).toLowerCase()

    if (
      group.includes('positive') ||
      group.includes('joy') ||
      group.includes('happy') ||
      group.includes('calm') ||
      group.includes('good')
    ) {
      return 3
    }

    if (
      group.includes('negative') ||
      group.includes('sad') ||
      group.includes('angry') ||
      group.includes('fear') ||
      group.includes('stress')
    ) {
      return 1
    }

    if (
      group.includes('cautious') ||
      group.includes('neutral') ||
      group.includes('mixed') ||
      group.includes('anxious')
    ) {
      return 2
    }

    return null
  }

  const points = days.map((date, index) => {

    const dateString =
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    const entry = moodMap.get(dateString)
    const level = getMoodLevel(entry)

    return {
      date: dateString,
      dateObject: date,
      level,
      emotion: entry?.emotion || entry?.mood_group || '',
      index
    }
  })

  const positiveCount =
    points.filter(point => point.level === 3).length

  const cautiousCount =
    points.filter(point => point.level === 2).length

  const negativeCount =
    points.filter(point => point.level === 1).length

  const recordedCount =
    positiveCount +
    cautiousCount +
    negativeCount

  const chartWidth = 900
  const chartHeight = 300

  const paddingLeft = 58
  const paddingRight = 22
  const paddingTop = 30
  const paddingBottom = 48

  const graphWidth =
    chartWidth -
    paddingLeft -
    paddingRight

  const graphHeight =
    chartHeight -
    paddingTop -
    paddingBottom

  const getX = (index) =>
    paddingLeft +
    (index / 29) *
    graphWidth

  const getY = (level) =>
    paddingTop +
    ((3 - level) / 2) *
    graphHeight

  const moodLabel = (level) => {
    if (level === 3) return 'Positive'
    if (level === 2) return 'Cautious'
    if (level === 1) return 'Negative'
    return ''
  }

  const moodClass = (level) => {
    if (level === 3) return 'mood-positive'
    if (level === 2) return 'mood-cautious'
    if (level === 1) return 'mood-negative'
    return ''
  }

  // Create a separate line segment for each consecutive pair
  // of days that both contain mood data.
  const lineSegments = []

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]
    const current = points[i]

    if (
      previous.level !== null &&
      current.level !== null
    ) {
      lineSegments.push({
        x1: getX(previous.index),
        y1: getY(previous.level),
        x2: getX(current.index),
        y2: getY(current.level),
        id: `${previous.date}-${current.date}`
      })
    }
  }

  const firstRecorded =
    points.find(point => point.level !== null)

  const lastRecorded =
    [...points]
      .reverse()
      .find(point => point.level !== null)

  let summaryText =
    'Your mood history will appear here as you add journal entries.'

  if (recordedCount === 1) {
    summaryText =
      'One day of mood data recorded. Keep journaling gently 🌱'
  } else if (recordedCount > 1) {
    if (
      firstRecorded &&
      lastRecorded &&
      lastRecorded.level > firstRecorded.level
    ) {
      summaryText =
        'Your recent mood pattern is looking more positive 🌿'
    } else if (
      firstRecorded &&
      lastRecorded &&
      lastRecorded.level < firstRecorded.level
    ) {
      summaryText =
        'Your recent mood pattern has been more difficult. Be gentle with yourself 💛'
    } else {
      summaryText =
        'Your mood has been fairly steady across the recorded days 🌸'
    }
  }

  return (
    <article className="dashboard-panel mood-history-panel">

      <div className="panel-heading">

        <div>
          <span className="panel-kicker">
            YOUR MOOD
          </span>

          <h2>
            Mood history · Last 30 days
          </h2>
        </div>

        <button
          className="panel-action"
          type="button"
          onClick={() => {
            window.location.href = '/journal'
          }}
        >
          Journal →
        </button>

      </div>


      <div className="mood-history-chart">

        {recordedCount === 0 ? (

          <div className="mood-history-empty">

            <div className="mood-history-empty-icon">
              🌷
            </div>

            <h3>
              Your mood story starts here
            </h3>

            <p>
              Write a journal entry and MindEase will
              start building your 30-day mood history.
            </p>

            <button
              type="button"
              className="mood-history-empty-button"
              onClick={() => {
                window.location.href = '/journal'
              }}
            >
              Write a journal →
            </button>

          </div>

        ) : (

          <div className="mood-history-svg-wrapper">

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              className="mood-history-svg"
              role="img"
              aria-label="Mood history for the last 30 days"
            >

              {/* Horizontal guide lines */}

              {[3, 2, 1].map(level => {

                const y = getY(level)

                return (
                  <line
                    key={`mood-grid-${level}`}
                    x1={paddingLeft}
                    x2={chartWidth - paddingRight}
                    y1={y}
                    y2={y}
                    className="mood-history-grid-line"
                  />
                )

              })}


              {/* Mood labels */}

              <text
                x="5"
                y={getY(3) + 5}
                className="mood-history-axis-label"
              >
                Positive
              </text>

              <text
                x="5"
                y={getY(2) + 5}
                className="mood-history-axis-label"
              >
                Cautious
              </text>

              <text
                x="5"
                y={getY(1) + 5}
                className="mood-history-axis-label"
              >
                Negative
              </text>


              {/* Connecting lines */}

              {lineSegments.map(segment => (
                <line
                  key={segment.id}
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  className="mood-history-line"
                />
              ))}


              {/* Mood points */}

              {points.map(point => {

                if (point.level === null) {
                  return null
                }

                return (
                  <g
                    key={point.date}
                    className={`mood-history-point-group ${moodClass(point.level)}`}
                  >

                    <circle
                      cx={getX(point.index)}
                      cy={getY(point.level)}
                      r="8"
                      className="mood-history-point-halo"
                    />

                    <circle
                      cx={getX(point.index)}
                      cy={getY(point.level)}
                      r="4.5"
                      className="mood-history-point"
                    />

                    <title>
                      {point.date} · {moodLabel(point.level)}
                      {point.emotion
                        ? ` · ${point.emotion}`
                        : ''}
                    </title>

                  </g>
                )

              })}


              {/* Date labels — show every 5th day to keep it readable */}

              {points.map((point, index) => {

                if (
                  index !== 0 &&
                  index !== 4 &&
                  index !== 9 &&
                  index !== 14 &&
                  index !== 19 &&
                  index !== 24 &&
                  index !== 29
                ) {
                  return null
                }

                return (
                  <text
                    key={`mood-date-${point.date}`}
                    x={getX(point.index)}
                    y={chartHeight - 14}
                    textAnchor="middle"
                    className="mood-history-date-label"
                  >
                    {point.dateObject.toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric'
                      }
                    )}
                  </text>
                )

              })}

            </svg>

          </div>

        )}

      </div>

<br></br><br></br>
      <div className="mood-history-footer">

        <div className="mood-history-counts">

  <div className="mood-count mood-count-positive">
    <span className="mood-count-dot"></span>

    <span className="mood-count-label">
      Positive
    </span>

    <strong>
      {positiveCount}
    </strong>
  </div>


  <div className="mood-count mood-count-cautious">
    <span className="mood-count-dot"></span>

    <span className="mood-count-label">
      Cautious
    </span>

    <strong>
      {cautiousCount}
    </strong>
  </div>


  <div className="mood-count mood-count-negative">
    <span className="mood-count-dot"></span>

    <span className="mood-count-label">
      Negative
    </span>

    <strong>
      {negativeCount}
    </strong>
  </div>

</div>

        <div className="mood-history-insight">

  <div className="mood-history-insight-icon">
    🌿
  </div>

  <div>
    <span className="mood-history-insight-label">
      Recent mood pattern
    </span>

    <span className="mood-history-insight-text">
      {summaryText}
    </span>
  </div>

</div>

      </div>

    </article>
  )
}


function ResourceCard({
  icon,
  category,
  title,
  description,
  duration,
  isVideo = false,
  onClick
}) {
  return (
    <article
      className="resource-card"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onClick()
        }
      }}
    >

      <div className="resource-thumbnail">

        <span className="resource-thumbnail-icon">
          {icon}
        </span>

        <button
          className="resource-play"
          aria-label={isVideo ? `Watch ${title}` : `Open ${title}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onClick?.()
          }}
        >
          {isVideo ? '▶' : '→'}
        </button>

      </div>

      <div className="resource-content">

        <span className="resource-category">
          {category}
        </span>

        <h3>{title}</h3>

        {description && (
          <p className="resource-description">
            {description}
          </p>
        )}

        <div className="resource-meta">
          <span>Read resource</span>
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