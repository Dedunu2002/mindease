import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import AdminSidebar from '../../components/AdminSidebar'
import '../../styles/AdminExercises.css'

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'Breathing',
  duration: '',
  instructions: '',
  icon: '🧘',
  media_url: '',
  is_active: true
}

const CATEGORIES = [
  'Breathing',
  'Grounding',
  'Relaxation',
  'Meditation',
  'Mindfulness',
  'Stress Management',
  'Sleep',
  'Other'
]

export default function AdminExercises() {
  const navigate = useNavigate()

  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadExercises = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/admin/exercises', {
        params: { search, category, status }
      })
      setExercises(response.data)
    } catch (err) {
      if (err.response?.status === 403) {
        navigate('/')
        return
      }
      setError(err.response?.data?.error || 'Could not load exercise content.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadExercises, 250)
    return () => clearTimeout(timer)
  }, [search, category, status])

  const stats = useMemo(() => ({
    total: exercises.length,
    active: exercises.filter(e => e.is_active).length,
    inactive: exercises.filter(e => !e.is_active).length
  }), [exercises])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (exercise) => {
    setEditing(exercise)
    setForm({
      title: exercise.title || '',
      description: exercise.description || '',
      category: exercise.category || 'Other',
      duration: exercise.duration || '',
      instructions: exercise.instructions || '',
      icon: exercise.icon || '🧘',
      media_url: exercise.media_url || '',
      is_active: exercise.is_active
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    if (!saving) setModalOpen(false)
  }

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const saveExercise = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim() ||
        !form.instructions.trim()) {
      alert('Please complete the required fields.')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await api.put(`/admin/exercises/${editing.id}`, form)
      } else {
        await api.post('/admin/exercises', form)
      }

      setModalOpen(false)
      await loadExercises()
    } catch (err) {
      alert(
        err.response?.data?.error ||
        'Could not save exercise.'
      )
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (exercise) => {
    try {
      await api.patch(
        `/admin/exercises/${exercise.id}/status`,
        { is_active: !exercise.is_active }
      )
      await loadExercises()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update exercise status.')
    }
  }

  const deleteExercise = async (exercise) => {
    const confirmed = window.confirm(
      `Delete "${exercise.title}"? This cannot be undone.`
    )
    if (!confirmed) return

    try {
      await api.delete(`/admin/exercises/${exercise.id}`)
      await loadExercises()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete exercise.')
    }
  }

  return (
    <div className="admin-app admin-exercises-app">
      <AdminSidebar />

      <main className="admin-main admin-exercises-main">
        <header className="admin-header admin-exercises-header">
          <div>
            <div className="admin-date">CONTENT MANAGEMENT</div>
            <h1>Manage <span>Exercise Content</span> 🧘</h1>
            <p>
              Create and maintain wellbeing exercises available to students.
            </p>
          </div>

          <button className="exercise-add-button" onClick={openCreate}>
            <span>＋</span>
            Add Exercise
          </button>
        </header>

        {error && <div className="admin-error">⚠️ {error}</div>}

        <section className="exercise-stat-grid">
          <Stat icon="🧘" label="TOTAL EXERCISES" value={stats.total} />
          <Stat icon="✓" label="ACTIVE" value={stats.active} />
          <Stat icon="○" label="INACTIVE" value={stats.inactive} />
        </section>

        <section className="exercise-toolbar">
          <div className="exercise-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises..."
            />
          </div>

          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
          </select>

          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button className="exercise-refresh" onClick={loadExercises}>
            ↻ Refresh
          </button>
        </section>

        <section className="exercise-content-panel">
          <div className="exercise-panel-heading">
            <div>
              <span>WELLNESS LIBRARY</span>
              <h2>Exercise Content</h2>
            </div>
            <strong>{exercises.length} shown</strong>
          </div>

          {loading ? (
            <div className="exercise-empty">
              <div className="exercise-loading">⟳</div>
              <strong>Loading exercises...</strong>
            </div>
          ) : exercises.length === 0 ? (
            <div className="exercise-empty">
              <div className="exercise-empty-icon">🧘</div>
              <strong>No exercises found</strong>
              <span>Try changing your filters or add a new exercise.</span>
            </div>
          ) : (
            <div className="exercise-list">
              {exercises.map(exercise => (
                <article className="exercise-admin-card" key={exercise.id}>
                  <div className="exercise-admin-icon">{exercise.icon || '🧘'}</div>

                  <div className="exercise-admin-info">
                    <div className="exercise-admin-meta">
                      <span>{exercise.category}</span>
                      {exercise.duration && <span>• {exercise.duration}</span>}
                    </div>

                    <h3>{exercise.title}</h3>
                    <p>{exercise.description}</p>

                    <div className="exercise-status-row">
                      <span className={`exercise-status ${exercise.is_active ? 'active' : 'inactive'}`}>
                        <i /> {exercise.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {exercise.media_url && <span className="exercise-media">🔗 Media attached</span>}
                    </div>
                  </div>

                  <div className="exercise-card-actions">
                    <button onClick={() => openEdit(exercise)} className="exercise-edit">
                      Edit
                    </button>
                    <button
                      onClick={() => toggleStatus(exercise)}
                      className={exercise.is_active ? 'exercise-disable' : 'exercise-enable'}
                    >
                      {exercise.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => deleteExercise(exercise)} className="exercise-delete">
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {modalOpen && (
        <div className="exercise-modal-backdrop" onMouseDown={closeModal}>
          <div className="exercise-modal" onMouseDown={e => e.stopPropagation()}>
            <div className="exercise-modal-header">
              <div>
                <span>{editing ? 'EDIT EXERCISE' : 'NEW EXERCISE'}</span>
                <h2>{editing ? 'Edit exercise' : 'Add exercise'}</h2>
              </div>
              <button onClick={closeModal}>×</button>
            </div>

            <form onSubmit={saveExercise}>
              <div className="exercise-form-grid">
                <label>
                  Title *
                  <input
                    value={form.title}
                    onChange={e => updateForm('title', e.target.value)}
                    placeholder="e.g. Box Breathing"
                    required
                  />
                </label>

                <label>
                  Category *
                  <select
                    value={form.category}
                    onChange={e => updateForm('category', e.target.value)}
                  >
                    {CATEGORIES.map(item => <option key={item}>{item}</option>)}
                  </select>
                </label>

                <label>
                  Duration
                  <input
                    value={form.duration}
                    onChange={e => updateForm('duration', e.target.value)}
                    placeholder="e.g. 5 minutes"
                  />
                </label>

                <label>
                  Icon
                  <input
                    value={form.icon}
                    onChange={e => updateForm('icon', e.target.value)}
                    maxLength={10}
                    placeholder="🧘"
                  />
                </label>

                <label className="exercise-form-full">
                  Description *
                  <textarea
                    value={form.description}
                    onChange={e => updateForm('description', e.target.value)}
                    placeholder="Short explanation of the exercise..."
                    rows="3"
                    required
                  />
                </label>

                <label className="exercise-form-full">
                  Instructions *
                  <textarea
                    value={form.instructions}
                    onChange={e => updateForm('instructions', e.target.value)}
                    placeholder="Explain how the student should complete the exercise..."
                    rows="6"
                    required
                  />
                </label>

                <label className="exercise-form-full">
                  Media URL
                  <input
                    type="url"
                    value={form.media_url}
                    onChange={e => updateForm('media_url', e.target.value)}
                    placeholder="https://..."
                  />
                </label>

                <label className="exercise-active-toggle">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => updateForm('is_active', e.target.checked)}
                  />
                  <span>
                    <strong>Publish exercise</strong>
                    <small>Students can see active exercises.</small>
                  </span>
                </label>
              </div>

              <div className="exercise-modal-actions">
                <button type="button" onClick={closeModal} className="exercise-cancel">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="exercise-save">
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Exercise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value }) {
  return (
    <article className="exercise-stat-card">
      <div className="exercise-stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}
