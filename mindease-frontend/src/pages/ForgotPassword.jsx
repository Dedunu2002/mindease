import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import '../styles/Auth.css'

export default function ForgotPassword() {

  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {

    e.preventDefault()

    setError('')
    setMessage('')
    setLoading(true)

    try {

      const response = await api.post(
        '/forgot-password',
        { email }
      )

      setMessage(
        response.data.message ||
        'If the email exists, a reset link has been sent.'
      )

    } catch (err) {

      setError(
        err.response?.data?.error ||
        'Unable to process the request.'
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
            Reset Password
          </h1>

          <p>
            Enter your university email to receive a
            password reset link.
          </p>

        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {message && (
          <div className="auth-success">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >

          <div className="form-group">

            <label>
              University Email
            </label>

            <input
              type="email"
              placeholder="you@university.lk"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
              required
            />

          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading
              ? 'Sending...'
              : 'Send Reset Link'}
          </button>

        </form>

        <p className="auth-switch">

          Remember your password?

          {' '}

          <Link to="/login">
            Back to Sign In
          </Link>

        </p>

      </div>

    </div>
  )
}