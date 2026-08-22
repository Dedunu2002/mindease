// src/components/SOSButton.jsx — updated version
import { useState }  from 'react'
import { Link }      from 'react-router-dom'
import api           from '../api/axios'
import '../styles/SOSButton.css'

export default function SOSButton() {
  const [showModal,   setShowModal]   = useState(false)
  const [alertState,  setAlertState]  = useState('idle')
  // alertState: 'idle' | 'sending' | 'sent' | 'error'
  const [sentCount,   setSentCount]   = useState(0)

  const handleSOS = async () => {
    setShowModal(true)
    setAlertState('sending')

    try {
      const res = await api.post('/sos')
      setSentCount(res.data.sent_to || 0)
      setAlertState('sent')
    } catch {
      // Still show the modal even if email fails
      // Student should still see the hotline number
      setAlertState('error')
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setAlertState('idle')
    setSentCount(0)
  }

  return (
    <>
      {/* Floating SOS button — always visible on student pages */}
      <button
        className="sos-btn"
        onClick={handleSOS}
        title="I need help now"
        aria-label="Emergency SOS button"
      >
        🆘 SOS
      </button>

      {/* Overlay + modal */}
      {showModal && (
        <div
          className="sos-overlay"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="SOS emergency support modal"
        >
          <div
            className="sos-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sos-modal-header">
              <h2>You are not alone 💙</h2>
              <button
                className="sos-close"
                onClick={closeModal}
                aria-label="Close SOS modal"
              >✕</button>
            </div>

            {/* Alert status — changes based on alertState */}
            <div className="sos-status">
              {alertState === 'sending' && (
                <p className="sos-sending">
                  <span className="sos-spinner"></span>
                  Alerting your support team...
                </p>
              )}

              {alertState === 'sent' && (
                <div className="sos-confirmed">
                  <span className="sos-check">✅</span>
                  <div>
                    <p>Your university counsellors have been alerted.</p>
                    {sentCount > 0 && (
                      <p className="sos-sent-count">
                        {sentCount} counsellor{sentCount > 1 ? 's' : ''} notified anonymously.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {alertState === 'error' && (
                <p className="sos-error-msg">
                  Could not send alert — please call 1926 directly for immediate help.
                </p>
              )}
            </div>

            {/* Crisis resources — always shown */}
            <div className="sos-resources">
              <h3>Immediate Support</h3>

              {/* Sumithrayo hotline */}
              <div className="sos-hotline">
                <span className="sos-icon">📞</span>
                <div>
                  <strong>Sumithrayo Sri Lanka</strong>
                  <p>24/7 Free Crisis Helpline</p>
                  <a href="tel:1926" className="sos-number">1926</a>
                </div>
              </div>

              {/* University counselling */}
              <div className="sos-hotline">
                <span className="sos-icon">🏥</span>
                <div>
                  <strong>University Counselling</strong>
                  <p>Visit the student services office or book a session below.</p>
                  <Link
                    to="/booking"
                    className="sos-book-link"
                    onClick={closeModal}
                  >
                    Book appointment →
                  </Link>
                </div>
              </div>

              {/* MindBot */}
              <div className="sos-hotline">
                <span className="sos-icon">💬</span>
                <div>
                  <strong>Talk to MindBot</strong>
                  <p>Our AI support chatbot is available right now.</p>
                  <Link
                    to="/chat"
                    className="sos-book-link"
                    onClick={closeModal}
                  >
                    Open MindBot →
                  </Link>
                </div>
              </div>

              <p className="sos-note">
                🔒 Your identity is completely anonymous. No personal
                information was shared with counsellors.
              </p>
            </div>

            <button
              className="btn-primary"
              onClick={closeModal}
              style={{ width:'100%', marginTop:'16px' }}
            >
              I understand — Close
            </button>

          </div>
        </div>
      )}
    </>
  )
}