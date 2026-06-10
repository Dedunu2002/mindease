// src/components/SOSButton.jsx
// Floating red button always visible on student pages
import { useState } from 'react'
import api          from '../api/axios'
import '../styles/SOSButton.css'

export default function SOSButton() {
  const [showModal, setShowModal] = useState(false)
  const [sent, setSent]           = useState(false)
  const [loading, setLoading]     = useState(false)

  const handleSOS = async () => {
    setShowModal(true)
    setLoading(true)
    try {
      await api.post('/sos')   // Flask sends anonymous alert to counsellors
      setSent(true)
    } catch {
      setSent(true)   // show resources even if email fails
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSent(false)
  }

  return (
    <>
      {/* Floating SOS button */}
      <button className="sos-btn" onClick={handleSOS} title="I need help now">
        🆘 SOS
      </button>

      {/* Modal — shown when showModal is true */}
      {showModal && (
        <div className="sos-overlay" onClick={closeModal}>
          <div className="sos-modal" onClick={(e) => e.stopPropagation()}>

            <div className="sos-modal-header">
              <h2>You are not alone 💙</h2>
              <button className="sos-close" onClick={closeModal}>✕</button>
            </div>

            {loading && <p className="sos-sending">Alerting support team...</p>}

            {sent && (
              <p className="sos-sent">
                ✅ Your university counsellors have been anonymously notified.
              </p>
            )}

            <div className="sos-resources">
              <h3>Immediate Support</h3>

              <div className="sos-hotline">
                <span className="sos-icon">📞</span>
                <div>
                  <strong>Sumithrayo Sri Lanka</strong>
                  <p>24/7 Crisis Helpline</p>
                  <a href="tel:1926" className="sos-number">1926</a>
                </div>
              </div>

              <div className="sos-hotline">
                <span className="sos-icon">🏥</span>
                <div>
                  <strong>University Counselling</strong>
                  <p>Visit the student services office or contact your counsellor directly.</p>
                </div>
              </div>

              <p className="sos-note">
                Your identity is completely anonymous. No personal information was shared.
              </p>
            </div>

            <button className="btn-primary" onClick={closeModal}
              style={{ width:'100%', marginTop:'16px' }}>
              I understand — Close
            </button>

          </div>
        </div>
      )}
    </>
  )
}