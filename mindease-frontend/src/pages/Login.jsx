import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import '../styles/Auth.css'

export default function Login() {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {

    e.preventDefault()

    setError('')
    setLoading(true)

    try {

      const res = await api.post('/login', {
        email,
        password
      })

      login(res.data.user)

      const role = res.data.user.role

      if (role === 'student') {
        navigate('/student-dashboard')
      }
      else if (role === 'counsellor') {
        navigate('/counsellor-dashboard')
      }
      else if (role === 'admin') {
        navigate('/admin-dashboard')
      }

    } catch (err) {

      setError(
        err.response?.data?.error ||
        'Login failed. Please try again.'
      )

    } finally {

      setLoading(false)

    }
  }

  return (

    <div className="auth-page">

      <div className="auth-card">

        <Link
          to="/"
          className="auth-back-home"
        >
          ← Back to home
        </Link>

        <div className="auth-header">

          <h1 className="brand">
            MindEase
          </h1>

          <p>
            Sign in to your account
          </p>

        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form
          onSubmit={handleLogin}
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
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

          </div>

          <div className="form-group">

            <div className="auth-label-row">

              <label>
                Password
              </label>

              <Link
                to="/forgot-password"
                className="forgot-password-link"
              >
                Forgot password?
              </Link>

            </div>

            <div className="password-input-wrapper">

              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword((prev) => !prev)
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
                    <path
                      d="M3 3l18 18M10.58 10.58A2 2 0 0013.42 13.42M9.88 5.09A10.94 10.94 0 0112 4.5c5 0 8.5 4.5 9.5 7.5a10.9 10.9 0 01-3.02 4.39M6.23 6.23C4.42 7.57 3.18 9.32 2.5 12c1 3 4.5 7.5 9.5 7.5a10.7 10.7 0 003.37-.54"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M2.5 12C3.5 9 7 4.5 12 4.5S20.5 9 21.5 12 18 19.5 12 19.5 3.5 15 2.5 12Z"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="2.8"
                    />
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
              ? 'Signing in...'
              : 'Sign In'}
          </button>

        </form>

        <p className="auth-switch">

          Don't have an account?

          {' '}

          <Link to="/register">
            Register here
          </Link>

        </p>

      </div>

    </div>
  )
}