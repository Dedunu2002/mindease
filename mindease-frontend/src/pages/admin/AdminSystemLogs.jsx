// src/pages/admin/AdminSystemLogs.jsx

import { useEffect, useMemo, useState } from 'react'
import api from '../../api/axios'
import AdminSidebar from '../../components/AdminSidebar'
import '../../styles/AdminSystemLogs.css'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function actionLabel(action) {
  return String(action || 'SYSTEM')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase())
}

function actionClass(action) {
  const value = String(action || '').toLowerCase()

  if (value.includes('delete') || value.includes('remove')) {
    return 'log-action danger'
  }

  if (value.includes('login') || value.includes('create')) {
    return 'log-action positive'
  }

  if (
    value.includes('update') ||
    value.includes('toggle') ||
    value.includes('change') ||
    value.includes('approve')
  ) {
    return 'log-action info'
  }

  return 'log-action neutral'
}

export default function AdminSystemLogs() {
  const [logs, setLogs] = useState([])
  const [actions, setActions] = useState([])

  const [summary, setSummary] = useState({
    total: 0,
    today: 0,
    admin: 0,
    counsellor: 0,
    student: 0
  })

  const [search, setSearch] = useState('')
  const [action, setAction] = useState('all')
  const [role, setRole] = useState('all')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadLogs = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true)
      else setRefreshing(true)

      setError('')

      const params = new URLSearchParams()

      if (search.trim()) params.set('search', search.trim())
      if (action !== 'all') params.set('action', action)
      if (role !== 'all') params.set('role', role)

      params.set('limit', '250')

      const response = await api.get(
        `/admin/system-logs?${params.toString()}`
      )

      setLogs(
        Array.isArray(response.data?.logs)
          ? response.data.logs
          : []
      )

      setActions(
        Array.isArray(response.data?.actions)
          ? response.data.actions
          : []
      )
    } catch (err) {
      console.error(
        'System logs error:',
        err.response?.data || err.message || err
      )

      setError(
        err.response?.data?.error ||
        'Unable to load system logs.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadSummary = async () => {
    try {
      const response = await api.get(
        '/admin/system-logs/summary'
      )

      if (response.data?.success) {
        setSummary({
          total: Number(response.data.total || 0),
          today: Number(response.data.today || 0),
          admin: Number(response.data.admin || 0),
          counsellor: Number(response.data.counsellor || 0),
          student: Number(response.data.student || 0)
        })
      }
    } catch (err) {
      console.error(
        'System log summary error:',
        err.response?.data || err.message || err
      )
    }
  }

  useEffect(() => {
    loadLogs(true)
    loadSummary()
  }, [])

  const handleSearch = event => {
    event.preventDefault()
    loadLogs(false)
  }

  const clearFilters = () => {
    setSearch('')
    setAction('all')
    setRole('all')

    setTimeout(() => {
      loadLogs(false)
    }, 0)
  }

  const visibleCount = useMemo(
    () => logs.length,
    [logs]
  )

  return (
    <div className="admin-logs-layout">
      <AdminSidebar />

      <main className="admin-logs-main">
        <div className="admin-logs-page">

      <header className="admin-logs-header">
        <div>
          <span className="admin-logs-kicker">
            SYSTEM
          </span>

          <h1>System Logs</h1>

          <p>
            Review important activity across the MindEase system.
          </p>
        </div>

        <button
          type="button"
          className="admin-logs-refresh"
          onClick={() => {
            loadLogs(false)
            loadSummary()
          }}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </header>

      <section className="admin-log-summary">

        <div className="admin-log-stat">
          <span className="admin-log-stat-icon">◷</span>
          <div>
            <small>Total events</small>
            <strong>{summary.total}</strong>
          </div>
        </div>

        <div className="admin-log-stat">
          <span className="admin-log-stat-icon today">✓</span>
          <div>
            <small>Today</small>
            <strong>{summary.today}</strong>
          </div>
        </div>

        <div className="admin-log-stat">
          <span className="admin-log-stat-icon admin">A</span>
          <div>
            <small>Admin events</small>
            <strong>{summary.admin}</strong>
          </div>
        </div>

        <div className="admin-log-stat">
          <span className="admin-log-stat-icon counsellor">C</span>
          <div>
            <small>Counsellor events</small>
            <strong>{summary.counsellor}</strong>
          </div>
        </div>

      </section>

      <section className="admin-log-panel">

        <div className="admin-log-panel-top">
          <div>
            <h2>Activity history</h2>
            <span>
              {visibleCount} event{visibleCount === 1 ? '' : 's'} shown
            </span>
          </div>

          <div className="admin-log-privacy">
            🔒 Non-sensitive audit metadata
          </div>
        </div>

        <form
          className="admin-log-filters"
          onSubmit={handleSearch}
        >

          <label className="admin-log-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search activity..."
              value={search}
              onChange={event =>
                setSearch(event.target.value)
              }
            />
          </label>

          <select
            value={action}
            onChange={event => {
              setAction(event.target.value)
              setTimeout(() => loadLogs(false), 0)
            }}
          >
            <option value="all">All actions</option>

            {actions.map(item => (
              <option key={item} value={item}>
                {actionLabel(item)}
              </option>
            ))}
          </select>

          <select
            value={role}
            onChange={event => {
              setRole(event.target.value)
              setTimeout(() => loadLogs(false), 0)
            }}
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="counsellor">Counsellor</option>
            <option value="student">Student</option>
            <option value="system">System</option>
          </select>

          <button
            type="submit"
            className="admin-log-search-button"
          >
            Search
          </button>

          {(search || action !== 'all' || role !== 'all') && (
            <button
              type="button"
              className="admin-log-clear"
              onClick={clearFilters}
            >
              Clear
            </button>
          )}
        </form>

        {loading ? (
          <div className="admin-log-state">
            <div className="admin-log-spinner"></div>
            <p>Loading system logs...</p>
          </div>
        ) : error ? (
          <div className="admin-log-state error">
            <span>⚠️</span>
            <h3>Unable to load logs</h3>
            <p>{error}</p>

            <button
              type="button"
              onClick={() => loadLogs(true)}
            >
              Try Again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="admin-log-state">
            <span className="admin-log-empty-icon">◷</span>
            <h3>No activity found</h3>
            <p>
              System activity will appear here as users and
              administrators interact with MindEase.
            </p>
          </div>
        ) : (
          <div className="admin-log-table-wrap">

            <table className="admin-log-table">

              <thead>
                <tr>
                  <th>Date &amp; time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Activity</th>
                  <th>Entity</th>
                  <th>IP address</th>
                </tr>
              </thead>

              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>

                    <td className="log-time">
                      {formatDate(log.created_at)}
                    </td>

                    <td>
                      <div className="log-user">

                        <span
                          className={`log-avatar ${
                            log.user_role || 'system'
                          }`}
                        >
                          {(log.user_name || 'S')
                            .charAt(0)
                            .toUpperCase()}
                        </span>

                        <div>
                          <strong>
                            {log.user_name || 'System'}
                          </strong>

                          <small>
                            {actionLabel(
                              log.user_role || 'system'
                            )}
                          </small>
                        </div>

                      </div>
                    </td>

                    <td>
                      <span className={actionClass(log.action)}>
                        {actionLabel(log.action)}
                      </span>
                    </td>

                    <td className="log-description">
                      {log.description}
                    </td>

                    <td>
                      <span className="log-entity">
                        {log.entity_type || '—'}
                        {log.entity_id
                          ? ` #${log.entity_id}`
                          : ''}
                      </span>
                    </td>

                    <td className="log-ip">
                      {log.ip_address || '—'}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>

          </div>
        )}

      </section>
        </div>
      </main>
    </div>
  )
}
