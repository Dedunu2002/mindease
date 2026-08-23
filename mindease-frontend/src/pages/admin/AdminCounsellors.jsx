import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import AdminSidebar from '../../components/AdminSidebar'
import '../../styles/AdminDashboard.css'

export default function AdminCounsellors() {

  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [counsellors, setCounsellors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')


  const loadCounsellors = async () => {

    try {

      setLoading(true)

      const response =
        await api.get('/admin/users')

      setCounsellors(
        response.data.filter(
          user => user.role === 'counsellor'
        )
      )

    } catch (err) {

      if (err.response?.status === 403) {
        navigate('/admin-dashboard')
        return
      }

      setError(
        err.response?.data?.error ||
        'Could not load counsellors.'
      )

    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadCounsellors()
  }, [])


  const approveCounsellor = async id => {

    try {

      await api.patch(
        `/admin/approve-counsellor/${id}`
      )

      await loadCounsellors()

    } catch (err) {

      alert(
        err.response?.data?.error ||
        'Could not approve counsellor.'
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
              COUNSELLOR MANAGEMENT
            </div>

            <h1>
              Counsellors
            </h1>

            <p>
              Review counsellor registrations and manage approvals.
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
                COUNSELLOR APPROVAL
              </span>

              <h2>
                Registered Counsellors
              </h2>

            </div>

            <span className="user-total">
              {counsellors.length} counsellors
            </span>

          </div>


          {loading ? (

            <div className="admin-empty">
              Loading counsellors...
            </div>

          ) : counsellors.length === 0 ? (

            <div className="admin-empty">

              <div className="admin-empty-icon">
                🩺
              </div>

              <strong>
                No counsellors registered
              </strong>

              <span>
                New counsellor registrations will appear here.
              </span>

            </div>

          ) : (

            <div className="approval-list">

              {counsellors.map(counsellor => (

                <div
                  className="approval-row"
                  key={counsellor.id}
                >

                  <div className="approval-user">

                    <div className="approval-avatar">
                      {counsellor.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>

                      <strong>
                        {counsellor.name}
                      </strong>

                      <span>
                        {counsellor.email}
                      </span>

                    </div>

                  </div>


                  <span
                    className={
                      counsellor.is_approved
                        ? 'status-badge status-active'
                        : 'status-badge status-pending'
                    }
                  >
                    {counsellor.is_approved
                      ? 'Active'
                      : 'Pending'}
                  </span>


                  {!counsellor.is_approved && (

                    <button
                      className="approve-button"
                      onClick={() =>
                        approveCounsellor(
                          counsellor.id
                        )
                      }
                    >
                      ✓ Approve
                    </button>

                  )}

                </div>

              ))}

            </div>

          )}

        </section>

      </main>

    </div>
  )
}