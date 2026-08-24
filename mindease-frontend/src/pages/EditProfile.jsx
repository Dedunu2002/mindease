import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import '../styles/EditProfile.css'

const API = 'http://localhost:5000/api'

export default function EditProfile() {

  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: ''
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  // ============================================================
  // LOAD CURRENT PROFILE
  // ============================================================

  useEffect(() => {
    loadProfile()
  }, [])


  const loadProfile = async () => {

    try {

      setLoading(true)
      setError('')

      const response = await fetch(
        `${API}/profile`,
        {
          method: 'GET',
          credentials: 'include'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to load profile'
        )
      }

      setForm({
        name: data.profile?.name || '',
        email: data.profile?.email || ''
      })

    } catch (err) {

      console.error(
        'Profile loading error:',
        err
      )

      setError(
        err.message || 'Unable to load your profile.'
      )

    } finally {

      setLoading(false)

    }
  }


  // ============================================================
  // HANDLE INPUT CHANGES
  // ============================================================

  const handleChange = (event) => {

    const {
      name,
      value
    } = event.target

    setForm(previous => ({
      ...previous,
      [name]: value
    }))

    // Clear old messages while typing
    setError('')
    setSuccess('')
  }


  // ============================================================
  // VALIDATE FORM
  // ============================================================

  const validateForm = () => {

    const name = form.name.trim()
    const email = form.email.trim()

    if (!name) {

      setError(
        'Please enter your full name.'
      )

      return false
    }

    if (name.length < 2) {

      setError(
        'Your name must contain at least 2 characters.'
      )

      return false
    }

    if (!email) {

      setError(
        'Please enter your email address.'
      )

      return false
    }

    // Basic email validation
    const emailPattern =
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

    if (!emailPattern.test(email)) {

      setError(
        'Please enter a valid email address.'
      )

      return false
    }

    return true
  }


  // ============================================================
  // SAVE PROFILE
  // ============================================================

  const handleSubmit = async (event) => {

    event.preventDefault()

    // Validate before sending
    if (!validateForm()) {
      return
    }

    try {

      setSaving(true)
      setError('')
      setSuccess('')

      const response = await fetch(
        `${API}/profile`,
        {
          method: 'PUT',

          headers: {
            'Content-Type': 'application/json'
          },

          credentials: 'include',

          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim()
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {

        throw new Error(
          data.error ||
          'Failed to update your profile.'
        )
      }

      // Update the form using the data
      // returned from the backend
      setForm({
        name: data.profile?.name || form.name.trim(),
        email: data.profile?.email || form.email.trim()
      })

      setSuccess(
        'Your profile has been updated successfully.'
      )

      // Give the user a moment to see
      // the success message
      setTimeout(() => {

        navigate('/profile')

      }, 900)

    } catch (err) {

      console.error(
        'Profile update error:',
        err
      )

      setError(
        err.message ||
        'Something went wrong while updating your profile.'
      )

    } finally {

      setSaving(false)

    }
  }


  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {

    return (

      <div className="edit-profile-page">

        <div className="edit-profile-loading">

          <div className="edit-profile-spinner">
            ⟳
          </div>

          <h2>
            Loading your profile
          </h2>

          <p>
            Please wait a moment...
          </p>

        </div>

      </div>
    )
  }


  // ============================================================
  // PAGE
  // ============================================================

  return (

    <div className="edit-profile-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="edit-profile-header">

        <Link
          to="/profile"
          className="back-profile-link"
        >
          ← Back to Profile
        </Link>

        <div className="edit-profile-heading">

          <span className="edit-profile-eyebrow">
            ACCOUNT SETTINGS
          </span>

          <h1>
            Edit Profile
          </h1>

          <p>
            Keep your personal information up to date.
          </p>

        </div>

      </div>


      {/* ======================================================
          MAIN CARD
      ====================================================== */}

      <div className="edit-profile-card">

        <form onSubmit={handleSubmit}>

          {/* ==================================================
              PROFILE INTRO
          ================================================== */}

          <div className="edit-profile-intro">

            <div className="edit-profile-intro-icon">
              👤
            </div>

            <div>

              <h2>
                Personal Information
              </h2>

              <p>
                These details are connected to your
                MindEase student account.
              </p>

            </div>

          </div>


          {/* ==================================================
              FORM
          ================================================== */}

          <div className="edit-profile-form">


            {/* ==================================================
                FULL NAME
            ================================================== */}

            <div className="form-field">

              <label htmlFor="name">
                Full Name
              </label>

              <span className="form-field-hint">
                This name will appear throughout your
                MindEase account.
              </span>

              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                maxLength={100}
                disabled={saving}
                autoComplete="name"
              />

            </div>


            {/* ==================================================
                EMAIL
            ================================================== */}

            <div className="form-field">

              <label htmlFor="email">
                Email Address
              </label>

              <span className="form-field-hint">
                Use an email address that you can access.
              </span>

              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                maxLength={150}
                disabled={saving}
                autoComplete="email"
              />

            </div>

          </div>


          {/* ==================================================
              ERROR MESSAGE
          ================================================== */}

          {error && (

            <div className="edit-profile-message error">

              <div className="edit-profile-message-icon">
                !
              </div>

              <div>

                <strong>
                  Unable to save changes
                </strong>

                <p>
                  {error}
                </p>

              </div>

            </div>

          )}


          {/* ==================================================
              SUCCESS MESSAGE
          ================================================== */}

          {success && (

            <div className="edit-profile-message success">

              <div className="edit-profile-message-icon">
                ✓
              </div>

              <div>

                <strong>
                  Profile updated
                </strong>

                <p>
                  {success}
                </p>

              </div>

            </div>

          )}


          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="edit-profile-actions">

            <Link
              to="/profile"
              className="cancel-profile-btn"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="save-profile-btn"
              disabled={saving}
            >

              {saving ? (
                <>
                  <span className="save-spinner">
                    ⟳
                  </span>

                  Saving...
                </>
              ) : (
                <>
                  ✓ Save Changes
                </>
              )}

            </button>

          </div>

        </form>

      </div>


      {/* ======================================================
          PRIVACY NOTE
      ====================================================== */}

      <div className="edit-profile-privacy">

        <span>
          🔒
        </span>

        <p>
          Your profile information is private and is
          only used to personalise your MindEase experience.
        </p>

      </div>

    </div>
  )
}