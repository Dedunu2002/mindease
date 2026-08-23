import { useAuth } from '../../context/AuthContext'
import AdminSidebar from '../../components/AdminSidebar'
import '../../styles/AdminDashboard.css'

export default function AdminSettings() {

  const { currentUser } = useAuth()

  return (
    <div className="admin-app">

      <AdminSidebar />

      <main className="admin-main">

        <header className="admin-header">

          <div>

            <div className="admin-date">
              SYSTEM SETTINGS
            </div>

            <h1>
              Settings
            </h1>

            <p>
              Manage your administrator account and system preferences.
            </p>

          </div>

          <div className="admin-header-avatar">
            {currentUser?.name?.charAt(0).toUpperCase()}
          </div>

        </header>


        <section className="admin-panel">

          <div className="admin-panel-heading">

            <div>

              <span className="admin-panel-kicker">
                ADMIN ACCOUNT
              </span>

              <h2>
                Administrator Information
              </h2>

            </div>

          </div>


          <div style={{
            padding: '24px'
          }}>

            <div style={{
              marginBottom: '18px'
            }}>

              <small style={{
                color: '#8a9891'
              }}>
                Name
              </small>

              <p style={{
                margin: '5px 0',
                color: '#40554a',
                fontWeight: 650
              }}>
                {currentUser?.name || 'Admin'}
              </p>

            </div>


            <div style={{
              marginBottom: '18px'
            }}>

              <small style={{
                color: '#8a9891'
              }}>
                Email
              </small>

              <p style={{
                margin: '5px 0',
                color: '#40554a',
                fontWeight: 650
              }}>
                {currentUser?.email || '—'}
              </p>

            </div>


            <div>

              <small style={{
                color: '#8a9891'
              }}>
                Role
              </small>

              <p style={{
                margin: '5px 0',
                color: '#28658c',
                fontWeight: 700
              }}>
                Administrator
              </p>

            </div>

          </div>

        </section>

      </main>

    </div>
  )
}