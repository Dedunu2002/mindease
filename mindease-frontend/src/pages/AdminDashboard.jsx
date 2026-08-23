import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import AdminSidebar from '../components/AdminSidebar'
import '../styles/AdminDashboard.css'


export default function AdminDashboard() {

  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [analytics, setAnalytics] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')


  useEffect(() => {
    loadAdminData()
  }, [])


  const loadAdminData = async () => {

    setLoading(true)
    setError('')

    try {

      const [usersResponse, analyticsResponse] =
        await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/analytics')
        ])

      setUsers(usersResponse.data)
      setAnalytics(analyticsResponse.data)

    } catch (err) {

      console.error('Admin dashboard error:', err)

      if (err.response?.status === 403) {
        navigate('/')
        return
      }

      setError(
        err.response?.data?.error ||
        'Could not load admin dashboard.'
      )

    } finally {
      setLoading(false)
    }
  }


  const approveCounsellor = async (userId) => {

    try {

      await api.patch(
        `/admin/approve-counsellor/${userId}`
      )

      await loadAdminData()

    } catch (err) {

      alert(
        err.response?.data?.error ||
        'Could not approve counsellor.'
      )
    }
  }


  const deleteUser = async (userId, name) => {

    const confirmed = window.confirm(
      `Are you sure you want to delete ${name}?`
    )

    if (!confirmed) return

    try {

      await api.delete(
        `/admin/delete-user/${userId}`
      )

      await loadAdminData()

    } catch (err) {

      alert(
        err.response?.data?.error ||
        'Could not delete user.'
      )
    }
  }


  const changeRole = async (userId, role) => {

    try {

      await api.patch(
        `/admin/change-role/${userId}`,
        { role }
      )

      await loadAdminData()

    } catch (err) {

      alert(
        err.response?.data?.error ||
        'Could not change role.'
      )
    }
  }


  const pendingCounsellors =
    users.filter(
      user =>
        user.role === 'counsellor' &&
        !user.is_approved
    )


  return (
    <div className="admin-app">

      <AdminSidebar />


      <main className="admin-main">

        {/* HEADER */}

        <header className="admin-header">

          <div>
            <div className="admin-date">
              ADMINISTRATION PORTAL
            </div>

            <h1>
              Good morning,{' '}
              <span>
                {currentUser?.name?.split(' ')[0] || 'Admin'}
              </span> 👋
            </h1>

            <p>
              Manage users and monitor the MindEase system.
            </p>
          </div>

          <div className="admin-header-avatar">
            {currentUser?.name?.charAt(0).toUpperCase()}
          </div>

        </header>


        {error && (
          <div className="admin-error">
            ⚠️ {error}
          </div>
        )}


        {/* STATISTICS */}

        <section className="admin-stat-grid">

          <StatCard
            icon="👨‍🎓"
            label="TOTAL STUDENTS"
            value={
              loading
                ? '—'
                : analytics?.total_students ?? 0
            }
            className="admin-stat-blue"
          />

          <StatCard
            icon="🩺"
            label="COUNSELLORS"
            value={
              loading
                ? '—'
                : analytics?.total_counsellors ?? 0
            }
            className="admin-stat-green"
          />

          <StatCard
            icon="💛"
            label="CHECK-INS THIS WEEK"
            value={
              loading
                ? '—'
                : analytics?.checkins_this_week ?? 0
            }
            className="admin-stat-yellow"
          />

          <StatCard
            icon="📅"
            label="TOTAL APPOINTMENTS"
            value={
              loading
                ? '—'
                : analytics?.total_appointments ?? 0
            }
            className="admin-stat-neutral"
          />

        </section>


        {/* PENDING APPROVALS */}

        <section className="admin-panel">

          <div className="admin-panel-heading">

            <div>
              <span className="admin-panel-kicker">
                ACTION REQUIRED
              </span>

              <h2>
                Pending Counsellor Approvals
              </h2>
            </div>

            <span className="pending-count">
              {pendingCounsellors.length} pending
            </span>

          </div>


          {loading ? (

            <div className="admin-empty">
              Loading approvals...
            </div>

          ) : pendingCounsellors.length === 0 ? (

            <div className="admin-empty">
              <div className="admin-empty-icon">
                ✓
              </div>

              <strong>
                No pending approvals
              </strong>

              <span>
                All counsellor registrations have been reviewed.
              </span>
            </div>

          ) : (

            <div className="approval-list">

              {pendingCounsellors.map(user => (

                <div
                  className="approval-row"
                  key={user.id}
                >

                  <div className="approval-user">

                    <div className="approval-avatar">
                      {user.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>

                  </div>


                  <span className="pending-badge">
                    Pending
                  </span>


                  <button
                    className="approve-button"
                    onClick={() =>
                      approveCounsellor(user.id)
                    }
                  >
                    ✓ Approve
                  </button>

                </div>

              ))}

            </div>

          )}

        </section>


        {/* USER MANAGEMENT */}

        <section className="admin-panel">

          <div className="admin-panel-heading">

            <div>
              <span className="admin-panel-kicker">
                USER MANAGEMENT
              </span>

              <h2>
                All Users
              </h2>
            </div>

            <span className="user-total">
              {users.length} users
            </span>

          </div>


          {loading ? (

            <div className="admin-empty">
              Loading users...
            </div>

          ) : (

            <div className="admin-table-wrapper">

              <table className="admin-users-table">

                <thead>

                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>

                </thead>


                <tbody>

                  {users.map(user => (

                    <tr key={user.id}>

                      <td>

                        <div className="table-user">

                          <div className="table-avatar">
                            {user.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <strong>
                            {user.name}
                          </strong>

                        </div>

                      </td>


                      <td className="table-email">
                        {user.email}
                      </td>


                      <td>

                        <select
                          className={`role-select role-${user.role}`}
                          value={user.role}
                          onChange={e =>
                            changeRole(
                              user.id,
                              e.target.value
                            )
                          }
                          disabled={
                            user.id === currentUser?.id
                          }
                        >

                          <option value="student">
                            Student
                          </option>

                          <option value="counsellor">
                            Counsellor
                          </option>

                          <option value="admin">
                            Admin
                          </option>

                        </select>

                      </td>


                      <td>

                        <span
                          className={
                            user.status === 'pending'
                              ? 'status-badge status-pending'
                              : 'status-badge status-active'
                          }
                        >
                          {user.status === 'pending'
                            ? 'Pending'
                            : 'Active'}
                        </span>

                      </td>


                      <td>

                        {user.id !== currentUser?.id && (

                          <button
                            className="delete-button"
                            onClick={() =>
                              deleteUser(
                                user.id,
                                user.name
                              )
                            }
                          >
                            Delete
                          </button>

                        )}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>


        {/* APPOINTMENT SUMMARY */}

        <section className="admin-bottom-grid">

          <SummaryBox
            title="Appointments"
            icon="📅"
            items={[
              [
                'Pending',
                analytics?.pending_appointments ?? 0
              ],
              [
                'Confirmed',
                analytics?.confirmed_appointments ?? 0
              ],
              [
                'Completed',
                analytics?.completed_appointments ?? 0
              ]
            ]}
          />

          <SummaryBox
            title="System Overview"
            icon="📊"
            items={[
              [
                'Students',
                analytics?.total_students ?? 0
              ],
              [
                'Counsellors',
                analytics?.total_counsellors ?? 0
              ],
              [
                'Pending approvals',
                analytics?.pending_counsellors ?? 0
              ]
            ]}
          />

        </section>

      </main>

    </div>
  )
}


/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  icon,
  label,
  value,
  className
}) {

  return (
    <article className={`admin-stat-card ${className}`}>

      <div className="admin-stat-top">

        <div className="admin-stat-icon">
          {icon}
        </div>

        <span>
          {label}
        </span>

      </div>

      <div className="admin-stat-value">
        {value}
      </div>

    </article>
  )
}


/* ============================================================
   SUMMARY BOX
============================================================ */

function SummaryBox({
  title,
  icon,
  items
}) {

  return (
    <article className="admin-summary-box">

      <div className="admin-summary-title">
        <span>{icon}</span>
        <h3>{title}</h3>
      </div>

      {items.map(([label, value]) => (

        <div
          className="admin-summary-row"
          key={label}
        >
          <span>{label}</span>
          <strong>{value}</strong>
        </div>

      ))}

    </article>
  )
}