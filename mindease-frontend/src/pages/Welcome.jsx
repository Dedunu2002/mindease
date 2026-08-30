import { Link } from 'react-router-dom'
import '../styles/Welcome.css'

export default function Welcome() {
  return (
    <div className="welcome-page">

      {/* Decorative background */}
      <div className="welcome-orb welcome-orb-one" />
      <div className="welcome-orb welcome-orb-two" />
      <div className="welcome-grid" />

      <header className="welcome-topbar">

        <Link to="/" className="welcome-brand">
          <span className="welcome-brand-icon">
            🌿
          </span>

          <span className="welcome-brand-name">
            MindEase
          </span>
        </Link>

        <div className="welcome-topbar-actions">

          <span className="welcome-topbar-text">
            Already have an account?
          </span>

          <Link
            to="/login"
            className="welcome-top-login"
          >
            Sign In
          </Link>

        </div>

      </header>

      <main className="welcome-main">

        <section className="welcome-hero">

          <div className="welcome-copy">

            <div className="welcome-pill">
              <span className="welcome-pill-dot" />
              Student Wellbeing Support
            </div>

            <h1>
              A calmer mind.
              <br />

              <span>
                A better you.
              </span>
            </h1>

            <p className="welcome-description">
              MindEase gives university students a private,
              supportive space to understand their wellbeing,
              build healthy habits and connect with the right
              support when it matters.
            </p>

            <div className="welcome-buttons">

              <Link
                to="/register"
                className="welcome-primary-btn"
              >
                <span>Get Started</span>
                <span className="welcome-arrow">
                  →
                </span>
              </Link>

              <Link
                to="/login"
                className="welcome-secondary-btn"
              >
                Sign In
              </Link>

            </div>

            <div className="welcome-trust-row">

              <div className="welcome-trust-item">
                <span className="welcome-check">✓</span>
                <span>Private</span>
              </div>

              <div className="welcome-trust-item">
                <span className="welcome-check">✓</span>
                <span>Student-focused</span>
              </div>

              <div className="welcome-trust-item">
                <span className="welcome-check">✓</span>
                <span>Supportive</span>
              </div>

            </div>

          </div>

          <div className="welcome-visual">

            <div className="welcome-glow-card">

              <div className="welcome-circle-large">
                <div className="welcome-leaf">
                  🌿
                </div>
              </div>

              <div className="welcome-visual-heading">
                Your wellbeing,
                <br />
                <span>one day at a time.</span>
              </div>

              <div className="welcome-mini-card welcome-mini-card-one">

                <div className="welcome-mini-icon">
                  🧠
                </div>

                <div>
                  <strong>
                    Daily Check-in
                  </strong>

                  <small>
                    Understand how you feel
                  </small>
                </div>

              </div>

              <div className="welcome-mini-card welcome-mini-card-two">

                <div className="welcome-mini-icon">
                  💬
                </div>

                <div>
                  <strong>
                    Gentle Support
                  </strong>

                  <small>
                    You're not alone
                  </small>
                </div>

              </div>

              <div className="welcome-stat">

                <span className="welcome-stat-number">
                  24/7
                </span>

                <span className="welcome-stat-label">
                  Supportive wellbeing space
                </span>

              </div>

            </div>

          </div>

        </section>

      </main>

      <footer className="welcome-footer">

        <span>
          Designed for university student wellbeing
        </span>

        <span className="welcome-footer-dot">
          •
        </span>

        <span>
          MindEase
        </span>

      </footer>

    </div>
  )
}