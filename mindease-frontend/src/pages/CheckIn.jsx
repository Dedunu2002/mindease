import { useState } from 'react'

import '../styles/CheckIn.css'

const API = 'http://localhost:5000/api'

const initialForm = {
  age: '',
  gender: '',
  academic_year: '',
  study_hours_per_day: '',
  exam_pressure: '',
  academic_performance: '',
  stress_level: '',
  sleep_hours: '',
  physical_activity: '',
  social_support: '',
  screen_time: '',
  internet_usage: '',
  financial_stress: '',
  family_expectation: ''
}

export default function CheckIn() {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target

    setForm(prev => ({
      ...prev,
      [name]: value
    }))

    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setResult(null)

    // Basic validation
    for (const [key, value] of Object.entries(form)) {
      if (value === '') {
        setError('Please complete all questions before submitting.')
        return
      }
    }

    setLoading(true)

    try {
      const payload = {
        age: Number(form.age),
        gender: form.gender,
        academic_year: Number(form.academic_year),
        study_hours_per_day: Number(form.study_hours_per_day),
        exam_pressure: Number(form.exam_pressure),
        academic_performance: Number(form.academic_performance),
        stress_level: Number(form.stress_level),
        sleep_hours: Number(form.sleep_hours),
        physical_activity: Number(form.physical_activity),
        social_support: Number(form.social_support),
        screen_time: Number(form.screen_time),
        internet_usage: Number(form.internet_usage),
        financial_stress: Number(form.financial_stress),
        family_expectation: Number(form.family_expectation)
      }

      const response = await fetch(`${API}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to submit your check-in.'
        )
      }

      setResult({
        risk: data.risk_result,
        checkin: data.checkin
      })

      setForm(initialForm)

    } catch (err) {
      console.error('Check-in error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRiskClass = (risk) => {
    if (risk === 'Low') return 'risk-low'
    if (risk === 'Medium') return 'risk-medium'
    return 'risk-high'
  }

  return (
    
    <div className="checkin-page">

      {/* Header */}
      <section className="checkin-header">

        <div className="checkin-header-icon">
          🌿
        </div>

        <div>
          <p className="checkin-eyebrow">
            DAILY WELLBEING CHECK-IN
          </p>

          <h1>
            How are you doing today?
          </h1>

          <p className="checkin-subtitle">
            Take a few minutes to check in with yourself.
            There are no right or wrong answers.
          </p>
        </div>

      </section>

      {/* Result */}
      {result && (
        <section className="checkin-result-card">

          <div className="result-sparkle">
            ✨
          </div>

          <p className="result-label">
            YOUR WELLBEING RESULT
          </p>

          <div className={`risk-badge ${getRiskClass(result.risk)}`}>
            {result.risk}
          </div>

          <h2>
            {result.risk === 'Low' &&
              'You seem to be doing well 🌷'
            }

            {result.risk === 'Medium' &&
              'It may be good to give yourself some extra care 💛'
            }

            {result.risk === 'High' &&
              'You may need some additional support 🌿'
            }
          </h2>

          <p>
            Thank you for taking the time to check in with yourself.
          </p>

          <button
            type="button"
            className="new-checkin-button"
            onClick={() => {
              setResult(null)
              window.scrollTo({
                top: 0,
                behavior: 'smooth'
              })
            }}
          >
            Complete another check-in
          </button>

        </section>
      )}

      {/* Form */}
      {!result && (
        <form
          className="checkin-form"
          onSubmit={handleSubmit}
        >

          {/* About You */}
          <CheckinSection
            icon="🧑‍🎓"
            title="About You"
            description="A little about your current situation."
          >

            <div className="form-grid">

              <NumberField
                label="Age"
                name="age"
                value={form.age}
                onChange={handleChange}
                min="16"
                max="100"
                placeholder="e.g. 22"
              />

              <SelectField
                label="Gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                options={[
                  ['Male', 'Male'],
                  ['Female', 'Female'],
                  ['Other', 'Other']
                ]}
              />

              <SelectField
                label="Academic Year"
                name="academic_year"
                value={form.academic_year}
                onChange={handleChange}
                options={[
                  ['1', 'Year 1'],
                  ['2', 'Year 2'],
                  ['3', 'Year 3'],
                  ['4', 'Year 4'],
                  ['5', 'Year 5']
                ]}
              />

            </div>

          </CheckinSection>

          {/* Academic */}
          <CheckinSection
            icon="📚"
            title="Academic Life"
            description="Tell us about your current academic experience."
          >

            <div className="form-grid">

              <NumberField
                label="Study Hours per Day"
                name="study_hours_per_day"
                value={form.study_hours_per_day}
                onChange={handleChange}
                min="0"
                max="24"
                step="0.5"
                placeholder="e.g. 4"
              />

              <NumberField
                label="Academic Performance"
                name="academic_performance"
                value={form.academic_performance}
                onChange={handleChange}
                min="0"
                max="100"
                placeholder="e.g. 75"
              />

            </div>

            <ScaleField
              label="How much exam pressure are you experiencing?"
              name="exam_pressure"
              value={form.exam_pressure}
              onChange={handleChange}
              max={5}
              low="Very low"
              high="Very high"
            />

          </CheckinSection>

          {/* Wellbeing */}
          <CheckinSection
            icon="🌿"
            title="Your Wellbeing"
            description="These questions help us understand your wellbeing."
          >

            <ScaleField
              label="How stressed have you been feeling?"
              name="stress_level"
              value={form.stress_level}
              onChange={handleChange}
              max={5}
              low="Very low"
              high="Very high"
            />

            <NumberField
              label="How many hours do you usually sleep per night?"
              name="sleep_hours"
              value={form.sleep_hours}
              onChange={handleChange}
              min="0"
              max="24"
              step="0.5"
              placeholder="e.g. 7"
            />

            <ScaleField
              label="How physically active are you?"
              name="physical_activity"
              value={form.physical_activity}
              onChange={handleChange}
              max={7}
              low="Very inactive"
              high="Very active"
            />

            <ScaleField
              label="How much social support do you feel you have?"
              name="social_support"
              value={form.social_support}
              onChange={handleChange}
              max={10}
              low="Very little"
              high="Very strong"
            />

          </CheckinSection>

          {/* Lifestyle */}
          <CheckinSection
            icon="🌸"
            title="Lifestyle & Environment"
            description="Understanding your everyday environment helps us provide better insights."
          >

            <div className="form-grid">

              <NumberField
                label="Screen Time per Day (hours)"
                name="screen_time"
                value={form.screen_time}
                onChange={handleChange}
                min="0"
                max="24"
                step="0.5"
                placeholder="e.g. 3"
              />

              <NumberField
                label="Internet Usage per Day (hours)"
                name="internet_usage"
                value={form.internet_usage}
                onChange={handleChange}
                min="0"
                max="24"
                step="0.5"
                placeholder="e.g. 5"
              />

            </div>

            <ScaleField
              label="How much financial stress are you experiencing?"
              name="financial_stress"
              value={form.financial_stress}
              onChange={handleChange}
              max={5}
              low="Very low"
              high="Very high"
            />

            <ScaleField
              label="How much pressure do you feel from family expectations?"
              name="family_expectation"
              value={form.family_expectation}
              onChange={handleChange}
              max={5}
              low="Very low"
              high="Very high"
            />

          </CheckinSection>

          {/* Error */}
          {error && (
            <div className="checkin-error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="checkin-submit-area">

            <div className="privacy-note">
              🔒 Your responses are private and used
              to provide your wellbeing assessment.
            </div>

            <button
              type="submit"
              className="submit-checkin"
              disabled={loading}
            >
              {loading
                ? 'Analysing your check-in...'
                : '🌿 Submit Daily Check-in'
              }
            </button>

          </div>

        </form>
      )}

    </div>
  )
}


/* ============================================================
   SECTION
============================================================ */

function CheckinSection({
  icon,
  title,
  description,
  children
}) {
  return (
    <section className="checkin-section">

      <div className="section-heading">

        <div className="section-icon">
          {icon}
        </div>

        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

      </div>

      {children}

    </section>
  )
}


/* ============================================================
   NUMBER FIELD
============================================================ */

function NumberField({
  label,
  name,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder
}) {
  return (
    <div className="field">

      <label htmlFor={name}>
        {label}
      </label>

      <input
        id={name}
        name={name}
        type="number"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
      />

    </div>
  )
}


/* ============================================================
   SELECT FIELD
============================================================ */

function SelectField({
  label,
  name,
  value,
  onChange,
  options
}) {
  return (
    <div className="field">

      <label htmlFor={name}>
        {label}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
      >
        <option value="">
          Select...
        </option>

        {options.map(([value, label]) => (
          <option
            key={value}
            value={value}
          >
            {label}
          </option>
        ))}

      </select>

    </div>
  )
}


/* ============================================================
   SCALE FIELD
============================================================ */

function ScaleField({
  label,
  name,
  value,
  onChange,
  max,
  low,
  high
}) {
  return (
    <div className="scale-field">

      <label>
        {label}
      </label>

      <div className="scale-options">

        {Array.from(
          { length: max },
          (_, index) => {
            const number = index + 1

            return (
              <label
                key={number}
                className={`scale-option ${
                  String(value) === String(number)
                    ? 'selected'
                    : ''
                }`}
              >

                <input
                  type="radio"
                  name={name}
                  value={number}
                  checked={
                    String(value) === String(number)
                  }
                  onChange={onChange}
                />

                <span>
                  {number}
                </span>

              </label>
            )
          }
        )}

      </div>

      <div className="scale-labels">
        <span>{low}</span>
        <span>{high}</span>
      </div>

    </div>
  )
}