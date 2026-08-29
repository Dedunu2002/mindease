import { useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import '../styles/Auth.css'

export default function ResetPassword() {

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = useMemo(
    () => searchParams.get('token') || '',
    [searchParams]
  )

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {

    e.preventDefault()

    setError('')
    setSuccess('')

    if (!token) {
      setError('Invalid or missing reset token.')
      return
    }

    if (password.length < 6) {
      setError(
        'Password must be at least 6 characters.'
      )
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {

      const response = await api.post(
        '/reset-password',
        {
          token,
          password
        }
      )

      setSuccess(
        response.data.message ||
        'Password reset successfully.'
      )

      setTimeout(() => {
        navigate('/login')
      }, 1800)

    } catch (err) {

      setError(
        err.response?.data?.error ||
        'Unable to reset your password.'
      )

    } finally {

      setLoading(false)

    }
  }

  return (

    <div className="auth-page">

      <div className="auth-card">

        <Link
          to="/login"
          className="auth-back-home"
        >
          ← Back to login
        </Link>

        <div className="auth-header">

          <h1 className="brand">
            New Password
          </h1>

          <p>
            Create a new password for your account.
          </p>

        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {success && (
          <div className="auth-success">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >

          <div className="form-group">

            <label>
              New Password
            </label>

            <div className="password-input-wrapper">

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (prev) => !prev
                  )
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >

                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M3 3l18 18M10.58 10.58A2 2 0 0013.42 13.42M9.88 5.09A10.94 10.94 0 0112 4.5c5 0 8.5 4.5 9.5 7.5a10.9 10.9 0 01-3.02 4.39M6.23 6.23C4.42 7.57 3.18 9.32 2.5 12c1 3 4.5 7.5 9.5 7.5a10.7 10.7 0 003.37-.54" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M2.5 12C3.5 9 7 4.5 12 4.5S20.5 9 21.5 12 18 19.5 12 19.5 3.5 15 2.5 12Z" />
                    <circle cx="12" cy="12" r="2.8" />
                  </svg>
                )}

              </button>

            </div>

          </div>

          <div className="form-group">

            <label>
              Confirm New Password
            </label>

            <div className="password-input-wrapper">

              <input
                type={
                  showConfirmPassword
                    ? 'text'
                    : 'password'
                }
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (prev) => !prev
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >

                {showConfirmPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M3 3l18 18M10.58 10.58A2 2 0 0013.42 13.42M9.88 5.09A10.94 10.94 0 0112 4.5c5 0 8.5 4.5 9.5 7.5a10.9 10.9 0 01-3.02 4.39M6.23 6.23C4.42 7.57 3.18 9.32 2.5 12c1 3 4.5 7.5 9.5 7.5a10.7 10.7 0 003.37-.54" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M2.5 12C3.5 9 7 4.5 12 4.5S20.5 9 21.5 12 18 19.5 12 19.5 3.5 15 2.5 12Z" />
                    <circle cx="12" cy="12" r="2.8" />
                  </svg>
                )}

              </button>

            </div>

          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading
              ? 'Updating...'
              : 'Reset Password'}
          </button>

        </form>

      </div>

    </div>
  )
}