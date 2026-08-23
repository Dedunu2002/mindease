import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import AdminSidebar from '../../components/AdminSidebar'
import '../../styles/AdminDashboard.css'

export default function AdminUsers() {

  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search and filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')


  /* ============================================================
     LOAD USERS
  ============================================================ */

  const loadUsers = async () => {

    try {

      setLoading(true)
      setError('')

      const response = await api.get('/admin/users')

      setUsers(response.data)

    } catch (err) {

      console.error('Could not load users:', err)

      if (err.response?.status === 403) {
        navigate('/admin-dashboard')
        return
      }

      setError(
        err.response?.data?.error ||
        'Could not load users.'
      )

    } finally {

      setLoading(false)

    }
  }


  useEffect(() => {
    loadUsers()
  }, [])


  /* ============================================================
     FILTER USERS
  ============================================================ */

  const filteredUsers = useMemo(() => {

    const searchText = search
      .trim()
      .toLowerCase()

    return users.filter(user => {

      const matchesSearch =
        !searchText ||
        user.name.toLowerCase().includes(searchText) ||
        user.email.toLowerCase().includes(searchText)

      const matchesRole =
        roleFilter === 'all' ||
        user.role === roleFilter

      const matchesStatus =
        statusFilter === 'all' ||
        user.status === statusFilter

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      )
    })

  }, [
    users,
    search,
    roleFilter,
    statusFilter
  ])


  /* ============================================================
     COUNTS
  ============================================================ */

  const studentCount = users.filter(
    user => user.role === 'student'
  ).length

  const counsellorCount = users.filter(
    user => user.role === 'counsellor'
  ).length

  const adminCount = users.filter(
    user => user.role === 'admin'
  ).length

  const pendingCount = users.filter(
    user => user.status === 'pending'
  ).length


  /* ============================================================
     CHANGE ROLE
  ============================================================ */

  const changeRole = async (userId, newRole) => {

    const user = users.find(
      item => item.id === userId
    )

    if (!user) return


    // Changing to counsellor requires approval
    if (
      newRole === 'counsellor' &&
      user.role !== 'counsellor'
    ) {

      const confirmed = window.confirm(
        `${user.name} will become a counsellor and will need admin approval before they can log in. Continue?`
      )

      if (!confirmed) {
        return
      }
    }


    try {

      await api.patch(
        `/admin/change-role/${userId}`,
        { role: newRole }
      )

      await loadUsers()

    } catch (err) {

      alert(
        err.response?.data?.error ||
        'Could not change user role.'
      )

    }

  }


  /* ============================================================
     DELETE USER
  ============================================================ */

  const deleteUser = async (userId, name) => {

    if (userId === currentUser?.id) {
      alert('You cannot delete your own admin account.')
      return
    }


    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${name}"?`
    )

    if (!confirmed) {
      return
    }


    try {

      await api.delete(
        `/admin/delete-user/${userId}`
      )

      await loadUsers()

    } catch (err) {

      alert(
        err.response?.data?.error ||
        'Could not delete user.'
      )

    }

  }


  /* ============================================================
     RESET FILTERS
  ============================================================ */

  const resetFilters = () => {

    setSearch('')
    setRoleFilter('all')
    setStatusFilter('all')

  }


  const hasFilters =
    search ||
    roleFilter !== 'all' ||
    statusFilter !== 'all'


  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="admin-app">

      <AdminSidebar />


      <main className="admin-main">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="admin-header">

          <div>

            <div className="admin-date">
              USER MANAGEMENT
            </div>

            <h1>
              All Users
            </h1>

            <p>
              View, search and manage MindEase user accounts.
            </p>

          </div>


          <div className="admin-header-avatar">
            {currentUser?.name?.charAt(0).toUpperCase()}
          </div>

        </header>


        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (

          <div className="admin-error">
            ⚠️ {error}
          </div>

        )}


        {/* ======================================================
            USER SUMMARY
        ====================================================== */}

        <section className="user-summary-grid">

          <UserSummaryCard
            icon="👥"
            label="ALL USERS"
            value={users.length}
            className="user-summary-blue"
          />

          <UserSummaryCard
            icon="👨‍🎓"
            label="STUDENTS"
            value={studentCount}
            className="user-summary-student"
          />

          <UserSummaryCard
            icon="🩺"
            label="COUNSELLORS"
            value={counsellorCount}
            className="user-summary-counsellor"
          />

          <UserSummaryCard
            icon="💛"
            label="PENDING"
            value={pendingCount}
            className="user-summary-pending"
          />

        </section>


        {/* ======================================================
            USER MANAGEMENT PANEL
        ====================================================== */}

        <section className="admin-panel">

          <div className="admin-panel-heading">

            <div>

              <span className="admin-panel-kicker">
                USER DIRECTORY
              </span>

              <h2>
                Registered Users
              </h2>

            </div>


            <span className="user-total">
              {filteredUsers.length} shown
            </span>

          </div>


          {/* ====================================================
              FILTER BAR
          ==================================================== */}

          <div className="user-filter-bar">

            {/* Search */}

            <div className="user-search">

              <span className="user-search-icon">
                🔎
              </span>

              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e =>
                  setSearch(e.target.value)
                }
              />

              {search && (

                <button
                  className="user-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  ×
                </button>

              )}

            </div>


            {/* Role */}

            <select
              className="user-filter-select"
              value={roleFilter}
              onChange={e =>
                setRoleFilter(e.target.value)
              }
            >

              <option value="all">
                All Roles
              </option>

              <option value="student">
                Students
              </option>

              <option value="counsellor">
                Counsellors
              </option>

              <option value="admin">
                Admins
              </option>

            </select>


            {/* Status */}

            <select
              className="user-filter-select"
              value={statusFilter}
              onChange={e =>
                setStatusFilter(e.target.value)
              }
            >

              <option value="all">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="pending">
                Pending
              </option>

            </select>


            {/* Reset */}

            {hasFilters && (

              <button
                className="user-reset-button"
                onClick={resetFilters}
              >
                Reset
              </button>

            )}

          </div>


          {/* ====================================================
              TABLE
          ==================================================== */}

          {loading ? (

            <div className="admin-empty">

              <div className="admin-loading-spinner" />

              <strong>
                Loading users...
              </strong>

            </div>

          ) : filteredUsers.length === 0 ? (

            <div className="admin-empty">

              <div className="admin-empty-icon">
                🔎
              </div>

              <strong>
                No users found
              </strong>

              <span>
                Try changing your search or filters.
              </span>

              {hasFilters && (

                <button
                  className="user-empty-reset"
                  onClick={resetFilters}
                >
                  Clear filters
                </button>

              )}

            </div>

          ) : (

            <div className="admin-table-wrapper">

              <table className="admin-users-table">

                <thead>

                  <tr>

                    <th>
                      USER
                    </th>

                    <th>
                      EMAIL
                    </th>

                    <th>
                      ROLE
                    </th>

                    <th>
                      STATUS
                    </th>

                    <th>
                      REGISTERED
                    </th>

                    <th>
                      ACTION
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredUsers.map(user => (

                    <tr key={user.id}>

                      {/* USER */}

                      <td>

                        <div className="table-user">

                          <div
                            className={`table-avatar table-avatar-${user.role}`}
                          >
                            {user.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <strong>
                            {user.name}
                          </strong>

                        </div>

                      </td>


                      {/* EMAIL */}

                      <td className="table-email">
                        {user.email}
                      </td>


                      {/* ROLE */}

                      <td>

                        <select
                          className={`role-select role-${user.role}`}
                          value={user.role}
                          disabled={
                            user.id === currentUser?.id
                          }
                          onChange={e =>
                            changeRole(
                              user.id,
                              e.target.value
                            )
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


                      {/* STATUS */}

                      <td>

                        <span
                          className={
                            user.status === 'pending'
                              ? 'status-badge status-pending'
                              : 'status-badge status-active'
                          }
                        >

                          <span className="status-dot" />

                          {user.status === 'pending'
                            ? 'Pending'
                            : 'Active'}

                        </span>

                      </td>


                      {/* REGISTERED */}

                      <td className="registered-date">

                        {user.created_at
                          ? new Date(
                              user.created_at
                            ).toLocaleDateString(
                              'en-GB',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }
                            )
                          : '—'}

                      </td>


                      {/* ACTION */}

                      <td>

                        {user.id !== currentUser?.id ? (

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

                        ) : (

                          <span className="current-admin-label">
                            You
                          </span>

                        )}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </main>

    </div>
  )
}


/* ============================================================
   USER SUMMARY CARD
============================================================ */

function UserSummaryCard({
  icon,
  label,
  value,
  className
}) {

  return (
    <article
      className={`user-summary-card ${className}`}
    >

      <div className="user-summary-icon">
        {icon}
      </div>

      <div className="user-summary-info">

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </article>
  )
}