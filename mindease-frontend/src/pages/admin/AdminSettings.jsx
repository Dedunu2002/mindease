import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import AdminSidebar from '../../components/AdminSidebar'
import api from '../../api/axios'
import '../../styles/AdminDashboard.css'

export default function AdminSettings() {
  const { currentUser } = useAuth()

  // Current admin profile
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })

  // New admin form
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')
  const [adminError, setAdminError] = useState('')

  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    setFormData({
      name: currentUser?.name || '',
      email: currentUser?.email || ''
    })
  }, [currentUser])

  const handleEdit = () => {
    setMessage('')
    setError('')

    setFormData({
      name: currentUser?.name || '',
      email: currentUser?.email || ''
    })

    setIsEditing(true)
  }

  const handleCancel = () => {
    setMessage('')
    setError('')

    setFormData({
      name: currentUser?.name || '',
      email: currentUser?.email || ''
    })

    setIsEditing(false)
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData(previous => ({
      ...previous,
      [name]: value
    }))
  }

  const handleSave = async (event) => {
    event.preventDefault()

    setMessage('')
    setError('')

    const name = formData.name.trim()
    const email = formData.email.trim().toLowerCase()

    if (!name) {
      setError('Name is required.')
      return
    }

    if (!email) {
      setError('Email is required.')
      return
    }

    setSaving(true)

    try {
      const response = await api.put('/profile', {
        name,
        email
      })

      const updatedProfile = response.data?.profile

      setFormData({
        name: updatedProfile?.name || name,
        email: updatedProfile?.email || email
      })

      setMessage(
        response.data?.message ||
        'Profile updated successfully.'
      )

      setIsEditing(false)

      // Reload so the sidebar receives the updated user information.
      setTimeout(() => {
        window.location.reload()
      }, 700)

    } catch (err) {
      console.error('Admin profile update error:', err)

      setError(
        err.response?.data?.error ||
        'Could not update your profile.'
      )
    } finally {
      setSaving(false)
    }
  }

  const openAddAdmin = () => {
    setShowAddAdmin(true)
    setAdminMessage('')
    setAdminError('')

    setNewAdmin({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
  }

  const closeAddAdmin = () => {
    if (addingAdmin) return

    setShowAddAdmin(false)
    setAdminMessage('')
    setAdminError('')

    setNewAdmin({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
  }

  const handleNewAdminChange = (event) => {
    const { name, value } = event.target

    setNewAdmin(previous => ({
      ...previous,
      [name]: value
    }))
  }

  const handleAddAdmin = async (event) => {
    event.preventDefault()

    setAdminMessage('')
    setAdminError('')

    const name = newAdmin.name.trim()
    const email = newAdmin.email.trim().toLowerCase()
    const password = newAdmin.password
    const confirmPassword = newAdmin.confirmPassword

    if (!name) {
      setAdminError('Name is required.')
      return
    }

    if (!email) {
      setAdminError('Email is required.')
      return
    }

    if (password.length < 6) {
      setAdminError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setAdminError('Passwords do not match.')
      return
    }

    setAddingAdmin(true)

    try {
      const response = await api.post('/admin/admins', {
        name,
        email,
        password
      })

      setAdminMessage(
        response.data?.message ||
        'New administrator created successfully.'
      )

      setNewAdmin({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      })

    } catch (err) {
      console.error('Create admin error:', err)

      setAdminError(
        err.response?.data?.error ||
        'Could not create the new administrator.'
      )
    } finally {
      setAddingAdmin(false)
    }
  }

  return (
    <div className="admin-app">

      <AdminSidebar />

      <main className="admin-main">

        <header className="admin-header">

          <div>
            <div className="admin-date">
              SYSTEM SETTINGS
            </div>

            <h1>Settings</h1>

            <p>
              Manage your administrator account and system preferences.
            </p>
          </div>

          <div className="admin-header-avatar">
            {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
          </div>

        </header>


        <section className="admin-panel admin-settings-panel">

          {/* =========================
              PANEL HEADER
          ========================= */}
          <div className="admin-panel-heading">

            <div>
              <span className="admin-panel-kicker">
                ADMIN ACCOUNT
              </span>

              <h2>
                Administrator Information
              </h2>
            </div>

            <div className="admin-settings-heading-actions">

              <button
                type="button"
                className="admin-settings-secondary-btn"
                onClick={openAddAdmin}
              >
                + Add New Admin
              </button>

              {!isEditing && (
                <button
                  type="button"
                  className="admin-edit-button"
                  onClick={handleEdit}
                >
                  ✏️ Edit
                </button>
              )}

            </div>

          </div>


          {/* =========================
              PROFILE MESSAGES
          ========================= */}

          {message && (
            <div className="admin-settings-success">
              ✓ {message}
            </div>
          )}

          {error && (
            <div className="admin-settings-error">
              ⚠️ {error}
            </div>
          )}


          {/* =========================
              PROFILE INFORMATION
          ========================= */}

          {!isEditing ? (

            <div className="admin-settings-content">

              <div className="admin-settings-field">
                <small>Name</small>

                <div className="admin-settings-value">
                  {currentUser?.name || 'Admin'}
                </div>
              </div>

              <div className="admin-settings-field">
                <small>Email</small>

                <div className="admin-settings-value">
                  {currentUser?.email || '—'}
                </div>
              </div>

              <div className="admin-settings-field">
                <small>Role</small>

                <div className="admin-settings-value admin-settings-role">
                  Administrator
                </div>
              </div>

            </div>

          ) : (

            <form
              className="admin-settings-form"
              onSubmit={handleSave}
            >

              <div className="admin-settings-field">
                <label htmlFor="admin-name">
                  Name
                </label>

                <input
                  id="admin-name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Enter your name"
                  disabled={saving}
                  required
                />
              </div>


              <div className="admin-settings-field">
                <label htmlFor="admin-email">
                  Email
                </label>

                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  maxLength={150}
                  autoComplete="email"
                  placeholder="Enter your email"
                  disabled={saving}
                  required
                />
              </div>


              <div className="admin-settings-field">
                <label>
                  Role
                </label>

                <div className="admin-settings-readonly">
                  <span>Administrator</span>
                  <small>
                    Role can only be changed by the system.
                  </small>
                </div>
              </div>


              <div className="admin-settings-actions">

                <button
                  type="button"
                  className="admin-cancel-button"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-save-button"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : '✓ Save Changes'}
                </button>

              </div>

            </form>
          )}


          {/* =========================
              ADD NEW ADMIN
          ========================= */}

          {showAddAdmin && (
            <div className="admin-add-admin-wrapper">

              <div className="admin-add-admin-header">

                <div>
                  <span className="admin-panel-kicker">
                    ADMIN MANAGEMENT
                  </span>

                  <h3>
                    Add New Administrator
                  </h3>

                  <p>
                    Create a new administrator account for the MindEase system.
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-add-admin-close"
                  onClick={closeAddAdmin}
                  disabled={addingAdmin}
                  aria-label="Close"
                >
                  ×
                </button>

              </div>


              <form
                className="admin-add-admin-form"
                onSubmit={handleAddAdmin}
              >

                <div className="admin-add-admin-grid">

                  <div className="admin-settings-field">
                    <label htmlFor="new-admin-name">
                      Full Name
                    </label>

                    <input
                      id="new-admin-name"
                      name="name"
                      type="text"
                      value={newAdmin.name}
                      onChange={handleNewAdminChange}
                      placeholder="Enter administrator name"
                      maxLength={100}
                      autoComplete="name"
                      disabled={addingAdmin}
                      required
                    />
                  </div>


                  <div className="admin-settings-field">
                    <label htmlFor="new-admin-email">
                      Email Address
                    </label>

                    <input
                      id="new-admin-email"
                      name="email"
                      type="email"
                      value={newAdmin.email}
                      onChange={handleNewAdminChange}
                      placeholder="admin@example.com"
                      maxLength={150}
                      autoComplete="email"
                      disabled={addingAdmin}
                      required
                    />
                  </div>


                  <div className="admin-settings-field">
                    <label htmlFor="new-admin-password">
                      Password
                    </label>

                    <input
                      id="new-admin-password"
                      name="password"
                      type="password"
                      value={newAdmin.password}
                      onChange={handleNewAdminChange}
                      placeholder="Minimum 6 characters"
                      autoComplete="new-password"
                      disabled={addingAdmin}
                      required
                    />
                  </div>


                  <div className="admin-settings-field">
                    <label htmlFor="new-admin-confirm-password">
                      Confirm Password
                    </label>

                    <input
                      id="new-admin-confirm-password"
                      name="confirmPassword"
                      type="password"
                      value={newAdmin.confirmPassword}
                      onChange={handleNewAdminChange}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      disabled={addingAdmin}
                      required
                    />
                  </div>

                </div>


                {adminError && (
                  <div className="admin-settings-error">
                    ⚠️ {adminError}
                  </div>
                )}

                {adminMessage && (
                  <div className="admin-settings-success">
                    ✓ {adminMessage}
                  </div>
                )}


                <div className="admin-add-admin-actions">

                  <button
                    type="button"
                    className="admin-cancel-button"
                    onClick={closeAddAdmin}
                    disabled={addingAdmin}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="admin-save-button"
                    disabled={addingAdmin}
                  >
                    {addingAdmin
                      ? 'Creating...'
                      : '✓ Create Administrator'}
                  </button>

                </div>

              </form>

            </div>
          )}

        </section>

      </main>

    </div>
  )
}