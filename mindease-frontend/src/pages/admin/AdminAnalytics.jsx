import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import AdminSidebar from '../../components/AdminSidebar'
import '../../styles/AdminDashboard.css'

export default function AdminAnalytics() {

  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')


  useEffect(() => {

    const loadAnalytics = async () => {

      try {

        const response =
          await api.get('/admin/analytics')

        setAnalytics(response.data)

      } catch (err) {

        if (err.response?.status === 403) {
          navigate('/admin-dashboard')
          return
        }

        setError(
          err.response?.data?.error ||
          'Could not load analytics.'
        )

      } finally {
        setLoading(false)
      }

    }

    loadAnalytics()

  }, [navigate])


  return (
    <div className="admin-app">

      <AdminSidebar />

      <main className="admin-main">

        <header className="admin-header">

          <div>

            <div className="admin-date">
              SYSTEM ANALYTICS
            </div>

            <h1>
              Analytics
            </h1>

            <p>
              Monitor activity across the MindEase platform.
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


        <section className="admin-stat-grid">

          <Stat
            icon="👨‍🎓"
            label="TOTAL STUDENTS"
            value={analytics?.total_students}
          />

          <Stat
            icon="🩺"
            label="COUNSELLORS"
            value={analytics?.total_counsellors}
          />

          <Stat
            icon="💛"
            label="CHECK-INS THIS WEEK"
            value={analytics?.checkins_this_week}
          />

          <Stat
            icon="📅"
            label="TOTAL APPOINTMENTS"
            value={analytics?.total_appointments}
          />

        </section>


        <div className="admin-bottom-grid">

          <Summary
            title="Appointment Overview"
            icon="📅"
            rows={[
              ['Pending', analytics?.pending_appointments],
              ['Confirmed', analytics?.confirmed_appointments],
              ['Completed', analytics?.completed_appointments]
            ]}
          />


          <Summary
            title="User Overview"
            icon="👥"
            rows={[
              ['Students', analytics?.total_students],
              ['Counsellors', analytics?.total_counsellors],
              ['Pending approvals', analytics?.pending_counsellors]
            ]}
          />

        </div>

      </main>

    </div>
  )
}


function Stat({ icon, label, value }) {

  return (
    <article className="admin-stat-card admin-stat-blue">

      <div className="admin-stat-top">

        <div className="admin-stat-icon">
          {icon}
        </div>

        <span>
          {label}
        </span>

      </div>

      <div className="admin-stat-value">
        {value ?? '—'}
      </div>

    </article>
  )
}


function Summary({ title, icon, rows }) {

  return (
    <article className="admin-summary-box">

      <div className="admin-summary-title">

        <span>
          {icon}
        </span>

        <h3>
          {title}
        </h3>

      </div>


      {rows.map(([label, value]) => (

        <div
          className="admin-summary-row"
          key={label}
        >

          <span>
            {label}
          </span>

          <strong>
            {value ?? '—'}
          </strong>

        </div>

      ))}

    </article>
  )
}