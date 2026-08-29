import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import '../styles/Auth.css'

export default function Register() {

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'student'
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    })

  }

  const handleRegister = async (e) => {

    e.preventDefault()

    setError('')
    setSuccess('')

    if (form.password !== form.confirm) {

      setError('Passwords do not match')

      return
    }

    setLoading(true)

    try {

      const res = await api.post('/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role
      })

      setSuccess(res.data.message)

      setTimeout(() => {
        navigate('/login')
      }, 2000)

    } catch (err) {

      setError(
        err.response?.data?.error ||
        'Registration failed. Try again.'
      )

    } finally {

      setLoading(false)

    }
  }

  const passwordEye = (visible) => {

    return visible ? (

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

    )
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
            Create your account
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
          onSubmit={handleRegister}
          className="auth-form"
        >

          <div className="form-group">

            <label>
              Full Name
            </label>

            <input
              type="text"
              name="name"
              placeholder="Your full name"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              required
            />

          </div>

          <div className="form-group">

            <label>
              University Email
            </label>

            <input
              type="email"
              name="email"
              placeholder="you@university.lk"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />

          </div>

          <div className="form-group">

            <label>
              Password
            </label>

            <div className="password-input-wrapper">

              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
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
                {passwordEye(showPassword)}
              </button>

            </div>

          </div>

          <div className="form-group">

            <label>
              Confirm Password
            </label>

            <div className="password-input-wrapper">

              <input
                type={
                  showConfirmPassword
                    ? 'text'
                    : 'password'
                }
                name="confirm"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={handleChange}
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
                {passwordEye(showConfirmPassword)}
              </button>

            </div>

          </div>

          <div className="form-group">

            <label>
              I am registering as
            </label>

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="student">
                Student
              </option>

              <option value="counsellor">
                Counsellor (requires admin approval)
              </option>

            </select>

          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading
              ? 'Creating account...'
              : 'Create Account'}
          </button>

        </form>

        <p className="auth-switch">

          Already have an account?

          {' '}

          <Link to="/login">
            Sign in here
          </Link>

        </p>

      </div>

    </div>
  )
}