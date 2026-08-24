// src/pages/Goals.jsx

import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import '../styles/Goals.css'


// ============================================================
// HELPERS
// ============================================================

const getMonday = (inputDate = new Date()) => {
  const date = new Date(inputDate)

  const day = date.getDay()

  const diff = day === 0 ? -6 : 1 - day

  date.setDate(date.getDate() + diff)

  date.setHours(0, 0, 0, 0)

  return date
}


const formatDateKey = (date) => {
  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0')

  const day = String(
    date.getDate()
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}


const getWeekDates = (weekStart) => {

  const start = new Date(`${weekStart}T00:00:00`)

  return Array.from(
    { length: 7 },
    (_, index) => {

      const date = new Date(start)

      date.setDate(
        start.getDate() + index
      )

      return date
    }
  )
}


const isSameDate = (dateA, dateB) => {

  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}


const formatWeekLabel = (weekStart) => {

  const start = new Date(`${weekStart}T00:00:00`)

  const end = new Date(start)

  end.setDate(
    start.getDate() + 6
  )

  const startText = start.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric'
    }
  )

  const endText = end.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric'
    }
  )

  return `${startText} – ${endText}`
}


const getDayName = (date) => {

  return date.toLocaleDateString(
    'en-US',
    {
      weekday: 'short'
    }
  ).toUpperCase()
}


const getMonthDay = (date) => {

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric'
    }
  )
}


// ============================================================
// GOALS PAGE
// ============================================================

export default function Goals() {

  const [goals, setGoals] = useState([])

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [dailySaving, setDailySaving] = useState(false)

  const [newGoal, setNewGoal] = useState('')

  const [error, setError] = useState('')

  const [successMessage, setSuccessMessage] = useState('')


  // ==========================================================
  // LOAD GOALS
  // ==========================================================

  const loadGoals = async () => {

    try {

      setLoading(true)

      setError('')

      const res = await api.get('/goals')

      setGoals(
        Array.isArray(res.data)
          ? res.data
          : []
      )

    } catch (err) {

      console.error(
        'Failed to load goals:',
        err
      )

      setError(
        err.response?.data?.error ||
        'Could not load your goals.'
      )

    } finally {

      setLoading(false)

    }
  }


  useEffect(() => {

    loadGoals()

  }, [])


  // ==========================================================
  // CURRENT WEEK
  // ==========================================================

  const currentMonday = useMemo(
    () => formatDateKey(
      getMonday()
    ),
    []
  )


  // ==========================================================
  // CURRENT WEEK GOAL
  // ==========================================================

  const currentGoal = useMemo(() => {

    return goals.find(
      goal =>
        goal.week_start === currentMonday
    ) || null

  }, [
    goals,
    currentMonday
  ])


  // ==========================================================
  // DAILY PROGRESS MAP
  // ==========================================================

  const dailyProgressMap = useMemo(() => {

    const map = {}

    if (!currentGoal) {
      return map
    }

    ;(
      currentGoal.daily_progress || []
    ).forEach(item => {

      map[item.date] =
        Boolean(item.completed)

    })

    return map

  }, [currentGoal])


  // ==========================================================
  // WEEK DATES
  // ==========================================================

  const weekDates = useMemo(() => {

    if (!currentGoal) {
      return []
    }

    return getWeekDates(
      currentGoal.week_start
    )

  }, [currentGoal])


  // ==========================================================
  // COMPLETED DAYS
  // ==========================================================

  const completedDays = useMemo(() => {

    if (!currentGoal) {
      return 0
    }

    return (
      currentGoal.completed_days ??
      weekDates.filter(
        date =>
          dailyProgressMap[
            formatDateKey(date)
          ]
      ).length
    )

  }, [
    currentGoal,
    weekDates,
    dailyProgressMap
  ])


  // ==========================================================
  // PROGRESS %
  // ==========================================================

  const progressPercentage = useMemo(() => {

    return Math.round(
      (completedDays / 7) * 100
    )

  }, [completedDays])


  // ==========================================================
  // TODAY
  // ==========================================================

  const today = useMemo(
    () => {

      const value = new Date()

      value.setHours(
        0,
        0,
        0,
        0
      )

      return value

    },
    []
  )


  // ==========================================================
  // STREAK
  // ==========================================================

  const currentStreak = useMemo(() => {

    if (!currentGoal) {
      return 0
    }

    let streak = 0

    const dates = [...weekDates]
      .reverse()

    for (const date of dates) {

      if (date > today) {
        continue
      }

      const key =
        formatDateKey(date)

      if (
        dailyProgressMap[key]
      ) {

        streak++

      } else {

        break

      }
    }

    return streak

  }, [
    currentGoal,
    weekDates,
    dailyProgressMap,
    today
  ])


  // ==========================================================
  // ADD NEW GOAL
  // ==========================================================

  const addGoal = async (e) => {

    e.preventDefault()

    const text =
      newGoal.trim()

    if (!text) {

      setError(
        'Please enter a goal.'
      )

      return

    }


    if (text.length > 200) {

      setError(
        'Your goal must be under 200 characters.'
      )

      return

    }


    try {

      setSaving(true)

      setError('')

      setSuccessMessage('')


      const res = await api.post(
        '/goals',
        {
          goal_text: text
        }
      )


      setGoals(prev => [
        res.data,
        ...prev
      ])


      setNewGoal('')

      setSuccessMessage(
        'Your weekly goal has been created.'
      )


      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)


    } catch (err) {

      console.error(
        'Failed to create goal:',
        err
      )

      setError(
        err.response?.data?.error ||
        'Could not create your goal.'
      )

    } finally {

      setSaving(false)

    }
  }


  // ==========================================================
  // UPDATE OVERALL STATUS
  // ==========================================================

  const updateGoalStatus = async (
    goalId,
    status
  ) => {

    try {

      setSaving(true)

      setError('')

      const res = await api.patch(
        `/goals/${goalId}`,
        {
          status
        }
      )


      setGoals(prev =>
        prev.map(goal =>
          goal.id === goalId
            ? res.data
            : goal
        )
      )


    } catch (err) {

      console.error(
        'Failed to update goal:',
        err
      )

      setError(
        err.response?.data?.error ||
        'Could not update the goal.'
      )

    } finally {

      setSaving(false)

    }
  }


  // ==========================================================
  // TOGGLE DAILY PROGRESS
  // ==========================================================

  const toggleDay = async (date) => {

    if (!currentGoal) {
      return
    }


    const dateKey =
      formatDateKey(date)


    // Future days cannot be completed.

    if (date > today) {
      return
    }


    const currentlyCompleted =
      Boolean(
        dailyProgressMap[dateKey]
      )


    try {

      setDailySaving(true)

      setError('')

      setSuccessMessage('')


      const res = await api.patch(
        `/goals/${currentGoal.id}/daily/${dateKey}`,
        {
          completed:
            !currentlyCompleted
        }
      )


      setGoals(prev =>
        prev.map(goal =>
          goal.id === currentGoal.id
            ? res.data.goal
            : goal
        )
      )


      setSuccessMessage(
        !currentlyCompleted
          ? 'Nice work! Day completed. 🌱'
          : 'Day marked as incomplete.'
      )


      setTimeout(() => {
        setSuccessMessage('')
      }, 2200)


    } catch (err) {

      console.error(
        'Failed to update daily progress:',
        err
      )

      setError(
        err.response?.data?.error ||
        'Could not update this day.'
      )

    } finally {

      setDailySaving(false)

    }
  }


  // ==========================================================
  // DELETE GOAL
  // ==========================================================

  const deleteGoal = async (
    goalId
  ) => {

    const confirmed =
      window.confirm(
        'Delete this goal and its daily progress?'
      )


    if (!confirmed) {
      return
    }


    try {

      setSaving(true)

      setError('')

      await api.delete(
        `/goals/${goalId}`
      )


      setGoals(prev =>
        prev.filter(
          goal =>
            goal.id !== goalId
        )
      )


    } catch (err) {

      console.error(
        'Failed to delete goal:',
        err
      )

      setError(
        err.response?.data?.error ||
        'Could not delete the goal.'
      )

    } finally {

      setSaving(false)

    }
  }


  // ==========================================================
  // STATUS
  // ==========================================================

  const getStatusInfo = (status) => {

    if (status === 'achieved') {

      return {
        label: 'Achieved',
        icon: '🏆',
        className: 'status-achieved'
      }

    }


    if (
      status === 'not_achieved'
    ) {

      return {
        label: 'Not Achieved',
        icon: '😔',
        className: 'status-not-achieved'
      }

    }


    return {
      label: 'In Progress',
      icon: '🎯',
      className: 'status-pending'
    }
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="page-wrapper">


      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <section className="goals-header">

        <h1>
          🎯 My Goals
        </h1>

        <p>
          Set one meaningful wellness goal each week
          and build progress through small daily actions.
        </p>

      </section>



      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div className="alert-error">

          ⚠️ {error}

        </div>

      )}



      {/* ======================================================
          SUCCESS
      ====================================================== */}

      {successMessage && (

        <div className="goal-success-message">

          ✓ {successMessage}

        </div>

      )}



      {/* ======================================================
          THIS WEEK
      ====================================================== */}

      <section className="goals-this-week">

        <h2>
          This Week's Goal
        </h2>


        {loading ? (

          <p className="goals-loading">
            Loading your goals...
          </p>

        ) : currentGoal ? (

          <>


            {/* ==================================================
                CURRENT GOAL
            ================================================== */}

            <div className="current-goal-card">


              <div className="current-goal-text">

                <div className="goal-icon-big">
                  🎯
                </div>


                <div>

                  <p className="goal-text">
                    {currentGoal.goal_text}
                  </p>


                  {(() => {

                    const status =
                      getStatusInfo(
                        currentGoal.status
                      )

                    return (

                      <span
                        className={`goal-status-badge ${status.className}`}
                      >

                        {status.icon}

                        {' '}

                        {status.label}

                      </span>

                    )

                  })()}

                </div>

              </div>


              <div className="current-goal-actions">

                <button
                  type="button"
                  className="btn-achieved"
                  onClick={() =>
                    updateGoalStatus(
                      currentGoal.id,
                      'achieved'
                    )
                  }
                  disabled={saving}
                >
                  ✓ Mark Achieved
                </button>


                <button
                  type="button"
                  className="btn-not-achieved"
                  onClick={() =>
                    updateGoalStatus(
                      currentGoal.id,
                      'not_achieved'
                    )
                  }
                  disabled={saving}
                >
                  ○ Not Achieved
                </button>


                <button
                  type="button"
                  className="btn-delete-goal"
                  onClick={() =>
                    deleteGoal(
                      currentGoal.id
                    )
                  }
                  disabled={saving}
                  aria-label="Delete goal"
                  title="Delete goal"
                >
                  🗑
                </button>

              </div>

            </div>



            {/* ==================================================
                DAILY TRACKER
            ================================================== */}

            <div className="goal-daily-section">


              <div className="daily-heading">

                <div>

                  <h3>
                    Your 7-Day Progress
                  </h3>

                  <p>
                    Check in each day to build your goal habit.
                  </p>

                </div>


                <div className="daily-count">

                  <strong>
                    {completedDays}
                  </strong>

                  <span>
                    / 7 days
                  </span>

                </div>

              </div>



              {/* ==================================================
                  PROGRESS BAR
              ================================================== */}

              <div className="goal-progress-wrapper">

                <div className="goal-progress-top">

                  <span>
                    Weekly progress
                  </span>

                  <strong>
                    {progressPercentage}%
                  </strong>

                </div>


                <div className="goal-progress-track">

                  <div
                    className="goal-progress-fill"
                    style={{
                      width:
                        `${progressPercentage}%`
                    }}
                  />

                </div>

              </div>



              {/* ==================================================
                  DAY CARDS
              ================================================== */}

              <div className="goal-days">

                {weekDates.map(
                  (date) => {

                    const key =
                      formatDateKey(date)

                    const completed =
                      Boolean(
                        dailyProgressMap[key]
                      )

                    const isToday =
                      isSameDate(
                        date,
                        today
                      )

                    const isFuture =
                      date > today


                    return (

                      <button
                        key={key}
                        type="button"
                        className={[
                          'goal-day',
                          completed
                            ? 'completed'
                            : '',
                          isToday
                            ? 'today'
                            : '',
                          isFuture
                            ? 'future'
                            : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() =>
                          toggleDay(date)
                        }
                        disabled={
                          isFuture ||
                          dailySaving
                        }
                        title={
                          isFuture
                            ? 'This day has not arrived yet'
                            : completed
                              ? 'Click to mark incomplete'
                              : 'Click to mark completed'
                        }
                      >

                        <span className="goal-day-name">
                          {getDayName(date)}
                        </span>


                        <span className="goal-day-circle">

                          {completed
                            ? '✓'
                            : isFuture
                              ? '🔒'
                              : '○'}

                        </span>


                        <span className="goal-day-date">
                          {getMonthDay(date)}
                        </span>


                        {isToday && (

                          <span className="goal-day-today">
                            TODAY
                          </span>

                        )}

                      </button>

                    )

                  }
                )}

              </div>



              {/* ==================================================
                  STREAK
              ================================================== */}

              <div className="goal-streak-card">

                <div className="goal-streak-icon">
                  🔥
                </div>


                <div>

                  <strong>
                    {currentStreak > 0
                      ? `${currentStreak}-day streak`
                      : 'Start your streak'}
                  </strong>

                  <p>

                    {currentStreak > 0
                      ? 'Keep going — small steps add up.'
                      : 'Complete today to begin your streak.'}

                  </p>

                </div>

              </div>

            </div>

          </>

        ) : (

          <>
            <div className="no-goal-msg">

              🌱 You haven't set a goal for this week yet.

              Choose one small, realistic action
              that can support your wellbeing.

            </div>


            {/* ==================================================
                NEW GOAL FORM
            ================================================== */}

            <form
              className="goal-form"
              onSubmit={addGoal}
            >

              <input
                type="text"
                className="goal-input"
                placeholder="e.g. Walk for 30 minutes every day"
                value={newGoal}
                onChange={(e) =>
                  setNewGoal(
                    e.target.value
                  )
                }
                maxLength={200}
                disabled={saving}
              />


              <button
                type="submit"
                className="btn-primary"
                disabled={
                  saving ||
                  !newGoal.trim()
                }
              >

                {saving
                  ? 'Saving...'
                  : '＋ Set Weekly Goal'}

              </button>

            </form>


            <p className="char-count">
              {newGoal.length} / 200
            </p>

          </>

        )}

      </section>



      {/* ======================================================
          PAST GOALS
      ====================================================== */}

      <section className="goals-history">

        <h2>
          Past Goals
        </h2>


        {loading ? (

          <p className="goals-loading">
            Loading...
          </p>

        ) : goals.filter(
          goal =>
            goal.week_start !== currentMonday
        ).length === 0 ? (

          <div className="no-goal-msg">

            Your completed weekly goals will appear here.

          </div>

        ) : (

          <div className="goals-grid">

            {goals
              .filter(
                goal =>
                  goal.week_start !== currentMonday
              )
              .map(goal => {

                const status =
                  getStatusInfo(
                    goal.status
                  )


                const goalCompletedDays =
                  goal.completed_days ?? 0


                return (

                  <div
                    key={goal.id}
                    className={`goal-history-card ${status.className}`}
                  >


                    <div className="goal-history-top">

                      <span className="goal-week-label">

                        Week of{' '}

                        {formatWeekLabel(
                          goal.week_start
                        )}

                      </span>


                      <span
                        className={`goal-status-badge ${status.className}`}
                      >

                        {status.icon}

                        {' '}

                        {status.label}

                      </span>

                    </div>


                    <p className="goal-history-text">

                      {goal.goal_text}

                    </p>


                    <div className="goal-history-progress">

                      <span>
                        Daily progress
                      </span>

                      <strong>
                        {goalCompletedDays}/7
                      </strong>

                    </div>


                    <div className="goal-history-progress-track">

                      <div
                        className="goal-history-progress-fill"
                        style={{
                          width:
                            `${Math.round(
                              (goalCompletedDays / 7) * 100
                            )}%`
                        }}
                      />

                    </div>


                    <div className="goal-history-btns">

                      <button
                        type="button"
                        className="btn-achieved-sm"
                        onClick={() =>
                          updateGoalStatus(
                            goal.id,
                            'achieved'
                          )
                        }
                        disabled={saving}
                        title="Mark achieved"
                      >
                        ✓
                      </button>


                      <button
                        type="button"
                        className="btn-not-achieved-sm"
                        onClick={() =>
                          updateGoalStatus(
                            goal.id,
                            'not_achieved'
                          )
                        }
                        disabled={saving}
                        title="Mark not achieved"
                      >
                        ○
                      </button>


                      <button
                        type="button"
                        className="btn-delete-goal"
                        onClick={() =>
                          deleteGoal(
                            goal.id
                          )
                        }
                        disabled={saving}
                        title="Delete goal"
                        aria-label="Delete goal"
                      >
                        🗑
                      </button>

                    </div>

                  </div>

                )

              })}

          </div>

        )}

      </section>


    </div>

  )

}