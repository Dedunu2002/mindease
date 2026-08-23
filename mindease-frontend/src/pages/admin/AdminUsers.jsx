import { useEffect, useState } from 'react'
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

  const loadUsers = async () => {

    try {

      setLoading(true)

      const response = await api.get('/admin/users')

      setUsers(response.data)

    } catch (err) {

      console.error(err)

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


  const changeRole = async (userId, role) => {

    try {

      await api.patch(
        `/admin/change-role/${userId}`,
        { role }
      )

      await loadUsers()

    } catch (err) {

      alert(
        err.response?.data?.error ||
        'Could not change role.'
      )
    }
  }


  const deleteUser = async (userId, name) => {

    if (
      !window.confirm(
        `Are you sure you want to delete ${name}?`
      )
    ) {
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


  return (
    <div className="admin-app">

      <AdminSidebar />

      <main className="admin-main">

        <header className="admin-header">

          <div>
            <div className="admin-date">
              USER MANAGEMENT
            </div>

            <h1>
              All Users
            </h1>

            <p>
              View and manage all MindEase user accounts.
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


        <section className="admin-panel">

          <div className="admin-panel-heading">

            <div>
              <span className="admin-panel-kicker">
                USER MANAGEMENT
              </span>

              <h2>
                Registered Users
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

      </main>

    </div>
  )
}