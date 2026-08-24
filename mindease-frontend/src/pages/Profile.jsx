import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import '../styles/Profile.css'

const API = 'http://localhost:5000/api'


export default function Profile() {

  const [profile, setProfile] = useState(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')


  useEffect(() => {

    loadProfile()

  }, [])


  // ============================================================
  // LOAD PROFILE
  // ============================================================

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


      setProfile(data.profile)

    }

    catch (err) {

      console.error(
        'Profile loading error:',
        err
      )

      setError(err.message)

    }

    finally {

      setLoading(false)

    }

  }


  // ============================================================
  // CREATE INITIALS
  // ============================================================

  const getInitials = (name) => {

    if (!name) {
      return '?'
    }


    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()

  }


  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (date) => {

    if (!date) {
      return '—'
    }


    return new Date(date).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
    )

  }


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {

    return (

      <div className="profile-page">

        <div className="profile-loading">

          <div className="profile-loading-spinner">
            ⟳
          </div>

          <p>
            Loading your profile...
          </p>

        </div>

      </div>

    )

  }


  // ============================================================
  // ERROR
  // ============================================================

  if (error) {

    return (

      <div className="profile-page">

        <div className="profile-error">

          <div className="profile-error-icon">
            !
          </div>

          <h2>
            Unable to load profile
          </h2>

          <p>
            {error}
          </p>

          <button
            className="profile-retry-btn"
            onClick={loadProfile}
          >
            Try Again
          </button>

        </div>

      </div>

    )

  }


  // ============================================================
  // PAGE
  // ============================================================

  return (

    <div className="profile-page">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="profile-header">

        <div className="profile-header-text">

          <span className="profile-eyebrow">
            ACCOUNT
          </span>

          <h1>
            My Profile
          </h1>

          <p>
            View and manage your personal information.
          </p>

        </div>


        <Link
          to="/profile/edit"
          className="profile-edit-button"
        >

          <span>
            ✎
          </span>

          Edit Profile

        </Link>

      </div>


      {/* ======================================================
          PROFILE CARD
      ====================================================== */}

      <div className="profile-card">


        {/* ====================================================
            PROFILE HERO
        ==================================================== */}

        <div className="profile-hero">

          <div className="profile-avatar">

            {getInitials(profile?.name)}

          </div>


          <div className="profile-identity">

            <h2>
              {profile?.name || 'Student'}
            </h2>

            <span className="profile-role">

              {profile?.role === 'student'
                ? 'Student'
                : profile?.role}

            </span>

          </div>

        </div>


        {/* ====================================================
            PERSONAL INFORMATION
        ==================================================== */}

        <div className="profile-section">

          <h3>
            Personal Information
          </h3>


          <div className="profile-info-grid">


            {/* NAME */}

            <div className="profile-info-item">

              <span className="profile-info-icon">
                👤
              </span>

              <div>

                <span className="profile-info-label">
                  Full Name
                </span>

                <strong>
                  {profile?.name || '—'}
                </strong>

              </div>

            </div>


            {/* EMAIL */}

            <div className="profile-info-item">

              <span className="profile-info-icon">
                ✉
              </span>

              <div>

                <span className="profile-info-label">
                  Email Address
                </span>

                <strong>
                  {profile?.email || '—'}
                </strong>

              </div>

            </div>


            {/* ROLE */}

            <div className="profile-info-item">

              <span className="profile-info-icon">
                🎓
              </span>

              <div>

                <span className="profile-info-label">
                  Account Type
                </span>

                <strong>

                  {profile?.role === 'student'
                    ? 'Student'
                    : profile?.role}

                </strong>

              </div>

            </div>


            {/* CREATED DATE */}

            <div className="profile-info-item">

              <span className="profile-info-icon">
                📅
              </span>

              <div>

                <span className="profile-info-label">
                  Member Since
                </span>

                <strong>
                  {formatDate(profile?.created_at)}
                </strong>

              </div>

            </div>


          </div>

        </div>


        {/* ====================================================
            ACCOUNT STATUS
        ==================================================== */}

        <div className="profile-status-section">

          <div className="profile-status-icon">
            ✓
          </div>


          <div className="profile-status-content">

            <strong>
              Account Active
            </strong>

            <p>
              Your MindEase account is active and ready to use.
            </p>

          </div>

        </div>


      </div>

    </div>

  )

}