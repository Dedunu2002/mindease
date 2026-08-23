// src/pages/Goals.jsx
import { useState, useEffect } from 'react'
import api                    from '../api/axios'
import '../styles/Goals.css'

const STATUS_CFG = {
  pending:      { label:'In Progress', icon:'🎯', bg:'#E6F1FB', color:'#0C447C' },
  achieved:     { label:'Achieved',    icon:'🏆', bg:'#EAF3DE', color:'#2E5E08' },
  not_achieved: { label:'Not Achieved',icon:'😔', bg:'#FAECE7', color:'#993C1D' },
}

export default function Goals() {
  const [goals,   setGoals]   = useState([])
  const [newGoal, setNewGoal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    api.get('/goals')
      .then(res => setGoals(res.data))
      .catch(()  => {})
      .finally(() => setLoading(false))
  }, [])

  // Current week goal = first pending goal for this week
  const getThisWeekStart = () => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)  // Monday
    return d.toISOString().split('T')[0]
  }
  const weekStart    = getThisWeekStart()
  const currentGoal  = goals.find(g => g.week_start === weekStart)
  const pastGoals    = goals.filter(g => g.week_start !== weekStart)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newGoal.trim()) return
    setError('')
    setSaving(true)
    try {
      const res = await api.post('/goals', { goal_text: newGoal.trim() })
      setGoals(prev => [res.data, ...prev])
      setNewGoal('')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save goal.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatus = async (id, status) => {
    try {
      const res = await api.patch(`/goals/${id}`, { status })
      // Update goal in local state immediately
      setGoals(prev => prev.map(g => g.id === id ? res.data : g))
    } catch {
      alert('Could not update goal.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal?')) return
    try {
      await api.delete(`/goals/${id}`)
      setGoals(prev => prev.filter(g => g.id !== id))
    } catch {
      alert('Could not delete goal.')
    }
  }

  return (
    <div className="page-wrapper">

      <div className="goals-header">
        <h1>🎯 Weekly Wellness Goals</h1>
        <p>Set one wellness goal each week and track whether you achieve it.</p>
      </div>

      {/* This week's goal */}
      <div className="goals-this-week card">
        <h2>This Week's Goal</h2>

        {loading ? (
          <p className="goals-loading">Loading...</p>
        ) : currentGoal ? (
          <div className="current-goal-card">
            <div className="current-goal-text">
              <span className="goal-icon-big">
                {STATUS_CFG[currentGoal.status]?.icon || '🎯'}
              </span>
              <div>
                <p className="goal-text">{currentGoal.goal_text}</p>
                <span
                  className="goal-status-badge"
                  style={{
                    background: STATUS_CFG[currentGoal.status]?.bg,
                    color:      STATUS_CFG[currentGoal.status]?.color,
                  }}
                >
                  {STATUS_CFG[currentGoal.status]?.label}
                </span>
              </div>
            </div>

            {currentGoal.status === 'pending' && (
              <div className="current-goal-actions">
                <button
                  className="btn-achieved"
                  onClick={() => handleStatus(currentGoal.id, 'achieved')}
                >
                  ✅ Mark Achieved
                </button>
                <button
                  className="btn-not-achieved"
                  onClick={() => handleStatus(currentGoal.id, 'not_achieved')}
                >
                  😔 Not Achieved
                </button>
                <button
                  className="btn-delete-goal"
                  onClick={() => handleDelete(currentGoal.id)}
                  title="Delete goal"
                >🗑</button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="no-goal-msg">
              No goal set for this week yet. What wellness habit will you focus on?
            </p>
            {error && <div className="alert-error">{error}</div>}
            <form onSubmit={handleCreate} className="goal-form">
              <input
                type="text"
                placeholder="e.g. Sleep 8 hours every night this week"
                value={newGoal}
                onChange={e => setNewGoal(e.target.value)}
                maxLength={200}
                className="goal-input"
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={saving || !newGoal.trim()}
              >
                {saving ? 'Saving...' : 'Set Goal 🎯'}
              </button>
            </form>
            <p className="char-count">{newGoal.length}/200 characters</p>
          </div>
        )}
      </div>

      {/* Past goals */}
      {pastGoals.length > 0 && (
        <div className="goals-history">
          <h2>Past Goals</h2>
          <div className="goals-grid">
            {pastGoals.map(goal => {
              const cfg = STATUS_CFG[goal.status] || STATUS_CFG.pending
              return (
                <div key={goal.id} className="goal-history-card"
                  style={{borderLeftColor: cfg.color}}>
                  <div className="goal-history-top">
                    <span className="goal-week-label">
                      Week of {new Date(goal.week_start + 'T00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
                    </span>
                    <span
                      className="goal-status-badge"
                      style={{background:cfg.bg,color:cfg.color}}
                    >{cfg.icon} {cfg.label}</span>
                  </div>
                  <p className="goal-history-text">{goal.goal_text}</p>
                  {goal.status === 'pending' && (
                    <div className="goal-history-btns">
                      <button className="btn-achieved-sm"
                        onClick={() => handleStatus(goal.id,'achieved')}>✅</button>
                      <button className="btn-not-achieved-sm"
                        onClick={() => handleStatus(goal.id,'not_achieved')}>😔</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}