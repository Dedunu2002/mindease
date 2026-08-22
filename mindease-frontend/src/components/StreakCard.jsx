// src/components/StreakCard.jsx
import { useEffect, useState } from 'react'
import api from '../api/axios'
import '../styles/StreakCard.css'

const MILESTONES = [
  { days:7,   badge:'🏅 Week Warrior' },
  { days:30,  badge:'🌟 Monthly Master' },
  { days:100, badge:'🏆 Consistency Champion' },
]

export default function StreakCard() {
  const [streak,  setStreak]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/streak')
      .then(res => setStreak(res.data))
      .catch(()  => setStreak({ current_streak:0, longest_streak:0, badges:[] }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="streak-card streak-loading">Loading streak...</div>

  const current = streak.current_streak || 0

  // Find the next milestone the student hasn't reached yet
  const next = MILESTONES.find(m => current < m.days) || MILESTONES[MILESTONES.length-1]
  const prevDays = MILESTONES.filter(m => m.days <= current).pop()?.days || 0
  const progressPct = current >= MILESTONES[MILESTONES.length-1].days
    ? 100
    : Math.round(((current - prevDays) / (next.days - prevDays)) * 100)

  return (
    <div className="streak-card">

      <div className="streak-top">
        <div className="streak-flame">🔥</div>
        <div>
          <p className="streak-num">{current}<span className="streak-unit"> day{current === 1 ? '' : 's'}</span></p>
          <p className="streak-label">Current streak · Best: {streak.longest_streak || 0} days</p>
        </div>
      </div>

      {/* Progress bar to next badge */} 
      if (current MILESTONES[MILESTONES.length-1].days) {}
      <div className="streak-progress-section">
        <div className="streak-progress-label">
          <span>Next badge: {next.badge}</span>
          <span>{current}/{next.days} days</span>
        </div>
        <div className="streak-progress-bar">
          <div className="streak-progress-fill"
            style={{ width: `${Math.min(progressPct,100)}%` }}></div>
        </div>
        <p className="streak-remaining">
          {Math.max(next.days - current, 0)} more day{(next.days-current)===1?'':'s'} to unlock {next.badge}
        </p>
      </div>

      {/* Earned badges */}
      {streak.badges?.length > 0 && (
        <div className="streak-badges">
          <p className="streak-badges-label">Badges earned</p>
          <div className="streak-badges-list">
            {streak.badges.map((b,i) => (
              <span key={i} className="streak-badge-pill">{b}</span>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}