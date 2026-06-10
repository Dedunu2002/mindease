// src/pages/Register.jsx
import { useState }          from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api                   from '../api/axios'
import '../styles/Auth.css'

export default function Register() {
  const [form, setForm]       = useState({
    name: '', email: '', password: '', confirm: '', role: 'student'
  })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate              = useNavigate()

  // Updates one field in the form object when user types
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Client-side check: passwords match
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/register', {
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     form.role
      })

      setSuccess(res.data.message)

      // Redirect to login after 2 seconds
      setTimeout(() => navigate('/login'), 2000)

    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-header">
          <h1 className="brand">MindEase</h1>
          <p>Create your account</p>
        </div>

        {error   && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleRegister} className="auth-form">

          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name"
              placeholder="Your full name"
              value={form.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>University Email</label>
            <input type="email" name="email"
              placeholder="you@university.lk"
              value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password"
              placeholder="Minimum 6 characters"
              value={form.password} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" name="confirm"
              placeholder="Repeat your password"
              value={form.confirm} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>I am registering as</label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="counsellor">Counsellor (requires admin approval)</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in here</Link>
        </p>

      </div>
    </div>
  )
}