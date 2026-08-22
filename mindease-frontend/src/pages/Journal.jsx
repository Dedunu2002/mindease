// src/pages/Journal.jsx
import { useState, useEffect } from 'react'
import api                    from '../api/axios'
import SentimentChart          from '../components/SentimentChart'
import '../styles/Journal.css'

// Emotion display config — maps backend label to UI display
const EMOTION_CONFIG = {
  joy:      { emoji:'😊', label:'Joy',      group:'Positive', colour:'#00B050', bg:'#EAF3DE' },
  love:     { emoji:'💚', label:'Love',     group:'Positive', colour:'#00B050', bg:'#EAF3DE' },
  surprise: { emoji:'😲', label:'Surprise', group:'Positive', colour:'#00B050', bg:'#EAF3DE' },
  fear:     { emoji:'😰', label:'Fear',     group:'Cautious', colour:'#EF9F27', bg:'#FAEEDA' },
  sadness:  { emoji:'😔', label:'Sadness',  group:'Negative', colour:'#4B8BDD', bg:'#E6F1FB' },
  anger:    { emoji:'😤', label:'Anger',    group:'Negative', colour:'#E24B4A', bg:'#FAECE7' },
}

// Small reusable emotion badge component
function EmotionBadge({ emotion }) {
  const cfg = EMOTION_CONFIG[emotion] || { emoji:'🧠', label:emotion, colour:'#6B7280', bg:'#F1F5F4' }
  return (
    <span className="emotion-badge"
      style={{ background:cfg.bg, color:cfg.colour }}>
      {cfg.emoji} {cfg.label}
    </span>
  )
}

export default function Journal() {
  const [content,   setContent]   = useState('')
  const [result,    setResult]    = useState(null)   // AI result after save
  const [entries,   setEntries]   = useState([])
  const [hasMore,   setHasMore]   = useState(false)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(false)
  const [listLoad,  setListLoad]  = useState(true)
  const [error,     setError]     = useState('')
  const charCount = content.length
  const MIN_CHARS  = 10

  // Load past journal entries when page opens
  useEffect(() => {
    loadEntries(1, true)
  }, [])

  const loadEntries = async (pageNum, replace = false) => {
    try {
      setListLoad(true)
      const res = await api.get(`/journals?page=${pageNum}`)
      setEntries(prev => replace ? res.data.entries : [...prev, ...res.data.entries])
      setHasMore(res.data.has_more)
      setPage(pageNum)
    } catch {
      // silently ignore
    } finally {
      setListLoad(false)
    }
  }

  // Submit new journal entry
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (charCount < MIN_CHARS) return
    setError('')
    setResult(null)
    setLoading(true)

    try {
      const res = await api.post('/journal', { content })

      // Show AI result banner
      setResult(res.data)

      // Prepend the new entry to the list instantly
      const newEntry = {
        id:         res.data.id,
        content,
        emotion:    res.data.emotion,
        mood_group: res.data.mood_group,
        date:       new Date().toISOString(),
      }
      setEntries(prev => [newEntry, ...prev])

      // Clear the text area
      setContent('')

    } catch (err) {
      setError(err.response?.data?.error || 'Could not save entry. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Delete an entry
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return
    try {
      await api.delete(`/journal/${id}`)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch {
      alert('Could not delete entry.')
    }
  }

  return (
    <div className="page-wrapper">

      <div className="journal-layout">

        {/* LEFT — write + result */}
        <div className="journal-left">

          <div className="journal-header">
            <h1>Daily Journal 📓</h1>
            <p>Write freely — our AI detects your emotion automatically.</p>
          </div>

          {/* AI result banner — shown after save */}
          {result && (
            <div className="result-banner"
              style={{ background: EMOTION_CONFIG[result.emotion]?.bg || '#E8F5F0' }}>
              <div className="banner-emotion">
                <span className="banner-emoji">
                  {EMOTION_CONFIG[result.emotion]?.emoji || '🧠'}
                </span>
                <div>
                  <p className="banner-label"
                    style={{ color: EMOTION_CONFIG[result.emotion]?.colour }}>
                    Detected emotion: {EMOTION_CONFIG[result.emotion]?.label || result.emotion}
                    {' '}
                    <span className="mood-group-tag">{result.mood_group}</span>
                  </p>
                  <p className="banner-msg">{result.message}</p>
                </div>
              </div>
              <button className="banner-close"
                onClick={() => setResult(null)}>✕</button>
            </div>
          )}

          {error && <div className="alert-error">{error}</div>}

          {/* Write form */}
          <form onSubmit={handleSubmit} className="journal-form">
            <div className="textarea-wrapper">
              <textarea
                placeholder="How are you feeling today? Write about your thoughts, experiences or emotions..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="journal-textarea"
                rows={7}
              />
              <div className="char-count"
                style={{ color: charCount < MIN_CHARS ? 'var(--red)' : 'var(--gray-500)' }}>
                {charCount} characters{charCount < MIN_CHARS && ` (need ${MIN_CHARS - charCount} more)`}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary journal-submit"
              disabled={loading || charCount < MIN_CHARS}
            >
              {loading ? 'Analysing emotion...' : 'Save Entry & Detect Emotion 🧠'}
            </button>
          </form>

          {/* Weekly sentiment chart */}
          <SentimentChart />

        </div>

        {/* RIGHT — past entries list */}
        <div className="journal-right">
          <h2 className="entries-title">Past Entries</h2>

          {listLoad && entries.length === 0 ? (
            <div className="entries-loading">Loading entries...</div>
          ) : entries.length === 0 ? (
            <div className="entries-empty">
              <span>📓</span>
              <p>No entries yet. Write your first one!</p>
            </div>
          ) : (
            <div className="entries-list">
              {entries.map((entry) => (
                <div key={entry.id} className="entry-card">

                  <div className="entry-header">
                    <span className="entry-date">
                      {new Date(entry.date).toLocaleDateString('en-GB', {
                        day:'numeric', month:'short', year:'numeric'
                      })}
                    </span>
                    <div className="entry-header-right">
                      {entry.emotion && <EmotionBadge emotion={entry.emotion} />}
                      <button
                        className="entry-delete"
                        onClick={() => handleDelete(entry.id)}
                        title="Delete entry"
                      >🗑</button>
                    </div>
                  </div>

                  <p className="entry-content">{entry.content}</p>

                </div>
              ))}

              {/* Load more button */}
              {hasMore && (
                <button
                  className="btn-secondary load-more"
                  onClick={() => loadEntries(page + 1)}
                  disabled={listLoad}
                >
                  {listLoad ? 'Loading...' : 'Load more entries'}
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}