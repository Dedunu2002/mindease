import { Link } from 'react-router-dom'
import '../styles/Welcome.css'

export default function Welcome() {
  return (
    <div className="welcome-page">

      <div className="welcome-background-shape welcome-shape-one"></div>
      <div className="welcome-background-shape welcome-shape-two"></div>

      <main className="welcome-container">

        <section className="welcome-card">

          <div className="welcome-logo">
            <div className="welcome-logo-mark">
              🌿
            </div>

            <span>MindEase</span>
          </div>

          <div className="welcome-content">

            <div className="welcome-badge">
              Student Wellbeing Support
            </div>

            <h1>
              Take care of your
              <span> wellbeing.</span>
            </h1>

            <p>
              A calm and supportive space for university students to
              understand their wellbeing, build healthy habits and
              access support when they need it.
            </p>

            <div className="welcome-actions">

              <Link
                to="/login"
                className="welcome-btn welcome-btn-primary"
              >
                Sign In
              </Link>

              <Link
                to="/register"
                className="welcome-btn welcome-btn-secondary"
              >
                Create Account
              </Link>

            </div>

            <div className="welcome-features">

              <div className="welcome-feature">
                <span>✓</span>
                <p>Wellbeing Check-ins</p>
              </div>

              <div className="welcome-feature">
                <span>✓</span>
                <p>AI-powered Support</p>
              </div>

              <div className="welcome-feature">
                <span>✓</span>
                <p>Counselling Access</p>
              </div>

            </div>

          </div>

          <div className="welcome-footer">
            <span>Your wellbeing matters.</span>
            <span>🌱</span>
          </div>

        </section>

      </main>

    </div>
  )
}