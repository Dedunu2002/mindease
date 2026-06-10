// src/pages/Login.jsx
import { useState }            from 'react'
import { useNavigate, Link }   from 'react-router-dom'
import { useAuth }             from '../context/AuthContext'
import api                     from '../api/axios'
import '../styles/Auth.css'

export default function Login() {
  // useState stores the values typed in the form
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')   // error message to show
  const [loading,  setLoading]  = useState(false) // true while waiting for Flask

  const { login }   = useAuth()      // from AuthContext
  const navigate    = useNavigate()  // used to redirect to dashboard

  // Called when the form is submitted
  const handleLogin = async (e) => {
    e.preventDefault()    // stop page from refreshing
    setError('')
    setLoading(true)

    try {
      // Send email + password to Flask
      const res = await api.post('/login', { email, password })

      // Save user in AuthContext
      login(res.data.user)

      // Redirect to the right dashboard based on role
      const role = res.data.user.role
      if      (role === 'student')    navigate('/student-dashboard')
      else if (role === 'counsellor') navigate('/counsellor-dashboard')
      else if (role === 'admin')      navigate('/admin-dashboard')

    } catch (err) {
      // Show error from Flask (wrong password, not found, etc.)
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo + heading */}
        <div className="auth-header">
          <h1 className="brand">MindEase</h1>
          <p>Sign in to your account</p>
        </div>

        {/* Error message — only shows if error is not empty */}
        {error && <div className="auth-error">{error}</div>}

        {/* Login form */}
        <form onSubmit={handleLogin} className="auth-form">

          <div className="form-group">
            <label>University Email</label>
            <input
              type="email"
              placeholder="you@university.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>

      </div>
    </div>
  )
}