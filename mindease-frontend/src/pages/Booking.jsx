// src/pages/Booking.jsx
import { useState, useEffect } from 'react'
import { Link }               from 'react-router-dom'
import api                    from '../api/axios'
import '../styles/Booking.css'

// Status badge colours for past appointments
const STATUS_CONFIG = {
  pending:   { label:'Pending',   bg:'#FFF3CD', color:'#856404', icon:'⏳' },
  confirmed: { label:'Confirmed', bg:'#EAF3DE', color:'#2E5E08', icon:'✅' },
  rejected:  { label:'Rejected',  bg:'#FAECE7', color:'#993C1D', icon:'❌' },
  completed: { label:'Completed', bg:'#E6F1FB', color:'#0C447C', icon:'🎓' },
}

export default function Booking() {
  // ── Form state ─────────────────────────────────────────────
  const [step,               setStep]               = useState(1)
  const [counsellors,        setCounsellors]        = useState([])
  const [selectedCounsellor, setSelectedCounsellor] = useState('')
  const [selectedDate,       setSelectedDate]       = useState('')
  const [slots,              setSlots]              = useState([])
  const [selectedSlot,       setSelectedSlot]       = useState('')
  const [notes,              setNotes]              = useState('')
  const [slotsLoading,       setSlotsLoading]       = useState(false)
  const [submitting,         setSubmitting]         = useState(false)
  const [error,              setError]              = useState('')
  const [confirmation,       setConfirmation]       = useState(null)

  // ── Past appointments ──────────────────────────────────────
  const [pastAppts,    setPastAppts]    = useState([])
  const [apptLoading,  setApptLoading]  = useState(true)

  // Load counsellors and past appointments on page open
  useEffect(() => {
    api.get('/counsellors')
      .then(res => setCounsellors(res.data))
      .catch(()  => setCounsellors([]))

    api.get('/appointments')
      .then(res => setPastAppts(res.data))
      .catch(()  => setPastAppts([]))
      .finally(() => setApptLoading(false))
  }, [])

  // Fetch available slots whenever counsellor OR date changes
  useEffect(() => {
    if (!selectedCounsellor || !selectedDate) {
      setSlots([])
      return
    }
    setSlotsLoading(true)
    setSelectedSlot('')
    setError('')

    api.get(`/slots?counsellor_id=${selectedCounsellor}&date=${selectedDate}`)
      .then(res => setSlots(res.data.available || []))
      .catch(err => {
        setError(err.response?.data?.error || 'Could not load slots')
        setSlots([])
      })
      .finally(() => setSlotsLoading(false))

  }, [selectedCounsellor, selectedDate])

  // Minimum date = today
  const today = new Date().toISOString().split('T')[0]

  const handleBook = async () => {
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/book', {
        counsellor_id: parseInt(selectedCounsellor),
        date:          selectedDate,
        time_slot:     selectedSlot,
        notes,
      })
      setConfirmation(res.data)
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setSelectedCounsellor('')
    setSelectedDate('')
    setSlots([])
    setSelectedSlot('')
    setNotes('')
    setError('')
    setConfirmation(null)
    // Refresh past appointments
    api.get('/appointments').then(res => setPastAppts(res.data)).catch(()=>{})
  }

  const counsellorName = counsellors.find(
    c => String(c.id) === String(selectedCounsellor)
  )?.name || ''

  return (
    <div className="page-wrapper">
      <div className="booking-layout">

        {/* ── LEFT: Booking Form ── */}
        <div className="booking-form-col">
          <div className="booking-header">
            <h1>📅 Book Appointment</h1>
            <p>Schedule a private session with a university counsellor.</p>
          </div>

          {/* Step progress indicator */}
          {step < 3 && (
            <div className="booking-steps">
              {[
                {n:1, label:'Select counsellor & date'},
                {n:2, label:'Pick a time slot'},
              ].map(s => (
                <div key={s.n}
                  className={`booking-step ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}
                >
                  <span className="step-circle">{step > s.n ? '✓' : s.n}</span>
                  <span className="step-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {error && <div className="alert-error">{error}</div>}

          {/* ── STEP 1: Counsellor + Date ── */}
          {step === 1 && (
            <div className="booking-card">

              <div className="form-group">
                <label>Select Counsellor</label>
                {counsellors.length === 0 ? (
                  <div className="no-counsellors">
                    No counsellors available yet. Please check back later or use the SOS button for urgent help.
                  </div>
                ) : (
                  <select
                    value={selectedCounsellor}
                    onChange={e => { setSelectedCounsellor(e.target.value); setSelectedDate(''); }}
                  >
                    <option value="">— Choose a counsellor —</option>
                    {counsellors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Select Date</label>
                <input
                  type="date"
                  min={today}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  disabled={!selectedCounsellor}
                />
                {!selectedCounsellor && (
                  <p className="field-hint">Select a counsellor first</p>
                )}
              </div>

              <button
                className="btn-primary booking-next-btn"
                onClick={() => setStep(2)}
                disabled={!selectedCounsellor || !selectedDate}
              >
                See Available Slots →
              </button>
            </div>
          )}

          {/* ── STEP 2: Time Slot ── */}
          {step === 2 && (
            <div className="booking-card">

              <div className="slot-summary">
                <p>
                  {counsellorName} · {new Date(selectedDate + 'T00:00').toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                </p>
                <button className="slot-back-btn"
                  onClick={() => setStep(1)}>← Change</button>
              </div>

              {slotsLoading ? (
                <div className="slots-loading">Loading available slots...</div>
              ) : slots.length === 0 ? (
                <div className="slots-empty">
                  <span>😔</span>
                  <p>No slots available on this date. Please choose a different date.</p>
                  <button className="btn-secondary"
                    onClick={() => setStep(1)}>← Choose another date</button>
                </div>
              ) : (
                <>
                  <p className="slots-instruction">Select a time slot:</p>
                  <div className="slots-grid">
                    {slots.map(slot => (
                      <button
                        key={slot}
                        className={`slot-btn ${selectedSlot === slot ? 'selected' : ''}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>

                  <div className="form-group" style={{marginTop:'20px'}}>
                    <label>Notes for counsellor <span className="optional-tag">optional</span></label>
                    <textarea
                      placeholder="Briefly describe what you would like to discuss (optional)..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <button
                    className="btn-primary booking-next-btn"
                    onClick={handleBook}
                    disabled={!selectedSlot || submitting}
                  >
                    {submitting ? 'Confirming booking...' : 'Confirm Appointment ✓'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── STEP 3: Confirmation ── */}
          {step === 3 && confirmation && (
            <div className="booking-confirmed">
              <div className="confirmed-icon">✅</div>
              <h2>Appointment Requested!</h2>
              <p>Your booking request has been sent to the counsellor.</p>

              <div className="confirmed-details">
                <div className="confirmed-row">
                  <span>Counsellor</span>
                  <strong>{confirmation.counsellor}</strong>
                </div>
                <div className="confirmed-row">
                  <span>Date</span>
                  <strong>{confirmation.date}</strong>
                </div>
                <div className="confirmed-row">
                  <span>Time</span>
                  <strong>{confirmation.time_slot}</strong>
                </div>
                <div className="confirmed-row">
                  <span>Status</span>
                  <span className="status-badge status-pending">⏳ Pending confirmation</span>
                </div>
              </div>

              <p className="confirmed-note">
                A confirmation email has been sent to your university email. You will receive another email when the counsellor confirms.
              </p>

              <div className="confirmed-actions">
                <button className="btn-primary" onClick={resetForm}>
                  Book Another
                </button>
                <Link to="/student-dashboard" className="btn-secondary">
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Past Appointments ── */}
        <div className="booking-history-col">
          <h2 className="history-title">My Appointments</h2>

          {apptLoading ? (
            <div className="history-loading">Loading...</div>
          ) : pastAppts.length === 0 ? (
            <div className="history-empty">
              <span>📅</span>
              <p>No appointments yet.</p>
            </div>
          ) : (
            <div className="history-list">
              {pastAppts.map(appt => {
                const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending
                return (
                  <div key={appt.id} className="history-card">
                    <div className="history-card-top">
                      <div>
                        <p className="history-counsellor">{appt.counsellor_name}</p>
                        <p className="history-datetime">
                          {appt.date} · {appt.time_slot}
                        </p>
                      </div>
                      <span
                        className="history-status"
                        style={{background:cfg.bg, color:cfg.color}}
                      >
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}