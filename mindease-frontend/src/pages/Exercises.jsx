// src/pages/Exercises.jsx
import { useState, useEffect, useRef } from 'react'
import api from '../api/axios'
import '../styles/Exercises.css'

// ── Box Breathing Config ───────────────────────────────────────
const BOX_PHASES = [
  { label:'Inhale',  instruction:'Breathe in slowly...',  duration:4, color:'#1A7A5E' },
  { label:'Hold',    instruction:'Hold your breath...',    duration:4, color:'#EF9F27' },
  { label:'Exhale',  instruction:'Breathe out slowly...', duration:4, color:'#4B8BDD' },
  { label:'Hold',    instruction:'Hold your breath...',    duration:4, color:'#EF9F27' },
]

// ── Box Breathing Component ────────────────────────────────────
function BoxBreathing() {
  const [running,     setRunning]     = useState(false)
  const [phaseIndex,  setPhaseIndex]  = useState(0)
  const [countdown,   setCountdown]   = useState(4)
  const [cycleCount,  setCycleCount]  = useState(0)
  const intervalRef  = useRef(null)   // holds setInterval ID
  const phaseRef     = useRef(0)      // tracks phase inside interval callback
  const countRef     = useRef(4)      // tracks countdown inside interval callback

  const start = () => {
    setRunning(true)
    setPhaseIndex(0)
    setCountdown(BOX_PHASES[0].duration)
    setCountdown(4)
    phaseRef.current = 0
    countRef.current = BOX_PHASES[0].duration

    intervalRef.current = setInterval(() => {
      countRef.current -= 1
      setCountdown(countRef.current)

      if (countRef.current <= 0) {
        // Move to next phase
        phaseRef.current = (phaseRef.current + 1) % BOX_PHASES.length
        const nextPhase = BOX_PHASES[phaseRef.current]
        countRef.current = nextPhase.duration
        setPhaseIndex(phaseRef.current)
        setCountdown(nextPhase.duration)

        // Count completed cycles (every 4 phases = 1 cycle)
        if (phaseRef.current === 0) {
          setCycleCount(prev => prev + 1)
        }
      }
    }, 1000)  // runs every 1 second
  }

  const stop = () => {
    clearInterval(intervalRef.current)
    setRunning(false)
    setPhaseIndex(0)
    setCountdown(4)
    setCycleCount(0)
    phaseRef.current = 0
    countRef.current = 4
  }

  // Clean up interval on unmount
  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  const phase = BOX_PHASES[phaseIndex]

  return (
    <div className="exercise-card">
      <div className="exercise-card-header">
        <h2>🌬 Box Breathing</h2>
        <p>4-4-4-4 breathing reduces anxiety within 2–3 minutes. Inhale → Hold → Exhale → Hold, each for 4 counts.</p>
      </div>

      <div className="breathing-area">
        {/* Animated square */}
        <div
          className={`breath-box ${running ? `phase-${phaseIndex}` : ''}`}
          style={{ borderColor: running ? phase.color : 'var(--teal)' }}
        >
          {running ? (
            <>
              <p className="breath-phase-label"
                style={{color: phase.color}}>{phase.label}</p>
              <p className="breath-countdown">{countdown}</p>
              <p className="breath-instruction">{phase.instruction}</p>
            </>
          ) : (
            <p className="breath-start-hint">Press Start</p>
          )}
        </div>

        {running && cycleCount > 0 && (
          <p className="cycle-count">
            🔄 {cycleCount} cycle{cycleCount !== 1 ? 's' : ''} completed
          </p>
        )}
      </div>

      <div className="exercise-actions">
        {!running ? (
          <button className="btn-primary" onClick={start}>▶ Start Exercise</button>
        ) : (
          <button className="btn-danger" onClick={stop}>⏹ Stop</button>
        )}
      </div>
    </div>
  )
}

// ── 5-4-3-2-1 Grounding Component ─────────────────────────────
function Grounding() {
  const [step, setStep] = useState(0)

  const STEPS = [
    { count:5, sense:'See',   icon:'👁',  prompt:'Name 5 things you can see right now',  examples:'Your phone, a window, a book, the ceiling, your hands' },
    { count:4, sense:'Touch', icon:'🖐',  prompt:'Name 4 things you can physically feel', examples:'Your chair, your clothes, the floor, the temperature' },
    { count:3, sense:'Hear',  icon:'👂',  prompt:'Name 3 things you can hear right now',   examples:'Traffic, fans, birds, breathing, voices' },
    { count:2, sense:'Smell', icon:'👃',  prompt:'Name 2 things you can smell',            examples:'Food, air freshener, your clothes, fresh air' },
    { count:1, sense:'Taste', icon:'👅',  prompt:'Name 1 thing you can taste',             examples:'Something you drank, toothpaste, the air' },
  ]

  const current = STEPS[step]

  return (
    <div className="exercise-card">
      <div className="exercise-card-header">
        <h2>🖐 5-4-3-2-1 Grounding</h2>
        <p>Use your five senses to anchor yourself to the present moment and break an anxiety spiral.</p>
      </div>

      {/* Step dots */}
      <div className="grounding-dots">
        {STEPS.map((s, i) => (
          <button
            key={i}
            className={`grounding-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}
            onClick={() => setStep(i)}
          >{s.count}</button>
        ))}
      </div>

      {step < STEPS.length ? (
        <div className="grounding-step-card">
          <span className="grounding-sense-icon">{current.icon}</span>
          <h3>{current.count} things you can {current.sense}</h3>
          <p className="grounding-prompt">{current.prompt}</p>
          <p className="grounding-examples">Examples: {current.examples}</p>
          <div className="grounding-nav">
            {step > 0 && <button className="btn-secondary"
              onClick={() => setStep(step-1)}>← Back</button>}
            {step < STEPS.length-1 && <button className="btn-primary"
              onClick={() => setStep(step+1)}>Next →</button>}
            {step === STEPS.length-1 && <button className="btn-primary"
              onClick={() => setStep(STEPS.length)}>Finish ✓</button>}
          </div>
        </div>
      ) : (
        <div className="grounding-complete">
          <span>🌟</span>
          <h3>Grounding complete!</h3>
          <p>You have anchored yourself in the present. Take a slow breath and notice how you feel.</p>
          <button className="btn-secondary" onClick={() => setStep(0)}>Repeat Exercise</button>
        </div>
      )}
    </div>
  )
}

// ── Progressive Muscle Relaxation Component ───────────────────
function MuscleRelaxation() {
  const MUSCLES = [
    { area:'Feet',       icon:'🦶', action:'Curl your toes tightly downward' },
    { area:'Calves',     icon:'🦵', action:'Flex your calf muscles by pointing toes up' },
    { area:'Thighs',     icon:'🦵', action:'Squeeze your thigh muscles together' },
    { area:'Stomach',    icon:'🤲', action:'Tighten your stomach by pulling it inward' },
    { area:'Hands',      icon:'✊', action:'Make tight fists with both hands' },
    { area:'Arms',       icon:'💪', action:'Flex your biceps by bending both arms' },
    { area:'Shoulders',  icon:'🤷', action:'Shrug shoulders tightly up to your ears' },
    { area:'Face',       icon:'😬', action:'Scrunch all your facial muscles tightly' },
  ]
  const [step,    setStep]    = useState(-1)   // -1 = not started
  const [holding, setHolding] = useState(false)
  const [timer,   setTimer]   = useState(5)
  const timerRef = useRef(null)

  const nextStep = () => {
    clearInterval(timerRef.current)
    setHolding(false)
    setTimer(5)
    setStep(prev => prev + 1)
  }

  const hold = () => {
    setHolding(true)
    setTimer(5)
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setHolding(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  return (
    <div className="exercise-card">
      <div className="exercise-card-header">
        <h2>💪 Progressive Muscle Relaxation</h2>
        <p>Tense each muscle group for 5 seconds, then release. Works through the body from feet to face, taking about 10 minutes.</p>
      </div>

      {step === -1 && (
        <div className="pmr-start">
          <p>Sit or lie comfortably. For each muscle group, tense as directed for 5 seconds, then completely release and notice the relaxation.</p>
          <button className="btn-primary"
            onClick={() => setStep(0)}>▶ Begin Exercise</button>
        </div>
      )}

      {step >= 0 && step < MUSCLES.length && (
        <div className="pmr-step">
          <div className="pmr-progress">
            {MUSCLES.map((_,i) => (
              <div key={i}
                className={`pmr-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}
              />
            ))}
          </div>
          <div className="pmr-muscle-card">
            <span className="pmr-icon">{MUSCLES[step].icon}</span>
            <h3>{MUSCLES[step].area}</h3>
            <p className="pmr-action">{MUSCLES[step].action}</p>
            {!holding ? (
              <button className="btn-primary" onClick={hold}>
                Tense for 5 seconds
              </button>
            ) : (
              <div className="pmr-hold">
                <div className="pmr-timer">{timer}</div>
                <p>Hold it...</p>
              </div>
            )}
            {timer === 0 && !holding && (
              <div className="pmr-release">
                <p>😮‍💨 Release! Notice the tension melting away...</p>
                <button className="btn-primary"
                  onClick={nextStep}>
                  {step < MUSCLES.length - 1 ? 'Next Muscle →' : 'Finish ✓'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {step >= MUSCLES.length && (
        <div className="pmr-complete">
          <span>🌿</span>
          <h3>Exercise complete!</h3>
          <p>Your body should feel noticeably more relaxed. Rest for a moment before continuing your day.</p>
          <button className="btn-secondary"
            onClick={() => { setStep(-1); setTimer(5); setHolding(false); }}>
            Repeat Exercise
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Exercises Page ────────────────────────────────────────
export default function Exercises() {
  const [activeTab, setActiveTab] = useState('breathing')
  const [adminExercises, setAdminExercises] = useState([])
  const [adminExercisesLoading, setAdminExercisesLoading] = useState(true)
  const [adminExercisesError, setAdminExercisesError] = useState('')

  useEffect(() => {
    const loadAdminExercises = async () => {
      try {
        setAdminExercisesLoading(true)
        setAdminExercisesError('')

        const response = await api.get('/exercises')

        // Flask currently returns the exercise list directly:
        // [ { id, title, description, category, duration,
        //     instructions, icon, media_url, is_active, ... } ]
        const exercises = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.exercises)
            ? response.data.exercises
            : []

        setAdminExercises(exercises)
      } catch (error) {
        console.error(
          'Failed to load exercises:',
          error.response?.data || error.message || error
        )

        // If the request fails, clear the old list so the UI
        // does not show an old count together with an error.
        setAdminExercises([])
        setAdminExercisesError(
          error.response?.data?.error ||
          'Unable to load additional exercises.'
        )
      } finally {
        setAdminExercisesLoading(false)
      }
    }

    loadAdminExercises()
  }, [])

  const renderAdminExercise = (exercise) => (
    <div className="exercise-card admin-exercise-card" key={`admin-${exercise.id}`}>
      <div className="exercise-card-header">
        <h2>{exercise.icon || '🌿'} {exercise.title}</h2>
        <p>{exercise.description}</p>
      </div>

      <div className="admin-exercise-meta">
        <span>🏷 {exercise.category || 'Wellness'}</span>
        {exercise.duration && (
          <span>⏱ {exercise.duration}</span>
        )}
      </div>

      {exercise.instructions && (
        <div className="admin-exercise-content">
          <strong>How to do it</strong>
          <p>{exercise.instructions}</p>
        </div>
      )}

      {exercise.media_url && (
        <div className="exercise-actions">
          <a
            className="btn-primary admin-exercise-link"
            href={exercise.media_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Resource →
          </a>
        </div>
      )}
    </div>
  )

  const TABS = [
    { id:'breathing',  label:'🌬 Box Breathing' },
    { id:'grounding',  label:'🖐 5-4-3-2-1 Grounding' },
    { id:'relaxation', label:'💪 Muscle Relaxation' },
  ]

  return (
    <div className="page-wrapper">
      <div className="exercises-header">
        <h1>🌿 Wellness Exercises</h1>
        <p>Guided exercises to calm your mind and body in minutes. No equipment needed.</p>
      </div>

      <div className="exercises-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`exercises-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >{tab.label}</button>
        ))}

        {adminExercises.length > 0 && (
          <button
            className={`exercises-tab ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            📚 More Exercises ({adminExercises.length})
          </button>
        )}
      </div>

      {activeTab === 'breathing'  && <BoxBreathing />}
      {activeTab === 'grounding'  && <Grounding />}
      {activeTab === 'relaxation' && <MuscleRelaxation />}

      {activeTab === 'library' && (
        <div className="admin-exercise-library">
          {adminExercisesLoading ? (
            <div className="admin-exercise-state">
              <div className="admin-exercise-spinner"></div>
              <p>Loading wellness exercises...</p>
            </div>
          ) : adminExercisesError && adminExercises.length === 0 ? (
            <div className="admin-exercise-state error">
              <span>⚠️</span>
              <p>{adminExercisesError}</p>
            </div>
          ) : adminExercises.length === 0 ? (
            <div className="admin-exercise-state">
              <span>🌿</span>
              <p>No additional exercises are available right now.</p>
            </div>
          ) : (
            adminExercises.map(renderAdminExercise)
          )}
        </div>
      )}
    </div>
  )
}