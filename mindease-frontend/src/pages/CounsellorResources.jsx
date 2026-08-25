import React, { useEffect, useMemo, useState } from 'react'
import CounsellorSidebar from '../components/CounsellorSidebar'
import '../styles/CounsellorResources.css'


const API_BASE = 'http://localhost:5000/api'

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'Stress',
  content: '',
  url: '',
  icon: '📄'
}

const CATEGORIES = [
  'All',
  'Anxiety',
  'Sleep',
  'Stress',
  'Motivation',
  'Loneliness'
]

const CATEGORY_ICONS = {
  Anxiety: '🌿',
  Sleep: '🌙',
  Stress: '🧘',
  Motivation: '✨',
  Loneliness: '🤝'
}

function CounsellorResources() {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingResource, setEditingResource] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const [actionId, setActionId] = useState(null)

  const filteredResources = useMemo(() => {
    return resources.filter(resource => {
      const matchesCategory =
        category === 'All' || resource.category === category

      const matchesStatus =
        status === 'all' ||
        (status === 'active' && resource.is_active) ||
        (status === 'inactive' && !resource.is_active)

      const term = search.trim().toLowerCase()
      const matchesSearch = !term || [
        resource.title,
        resource.description,
        resource.category,
        resource.content
      ].some(value =>
        String(value || '').toLowerCase().includes(term)
      )

      return matchesCategory && matchesStatus && matchesSearch
    })
  }, [resources, search, category, status])

  const loadResources = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true)
      setError('')

      const response = await fetch(
        `${API_BASE}/counsellor/resources`,
        {
          method: 'GET',
          credentials: 'include'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to load resources.'
        )
      }

      setResources(data.resources || [])
    } catch (err) {
      console.error('Resource management load error:', err)
      setError(err.message || 'Unable to load resources.')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  useEffect(() => {
    loadResources()
  }, [])

  const showNotice = message => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3500)
  }

  const openCreateModal = () => {
    setEditingResource(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  const openEditModal = resource => {
    setEditingResource(resource)
    setForm({
      title: resource.title || '',
      description: resource.description || '',
      category: resource.category || 'Stress',
      content: resource.content || '',
      url: resource.url || '',
      icon: resource.icon || '📄'
    })
    setError('')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditingResource(null)
    setForm(EMPTY_FORM)
  }

  const handleChange = event => {
    const { name, value } = event.target
    setForm(previous => ({
      ...previous,
      [name]: value
    }))
  }

  const handleSubmit = async event => {
    event.preventDefault()

    if (!form.title.trim() || !form.description.trim()) {
      setError('Please complete the title and description.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const isEditing = Boolean(editingResource)
      const url = isEditing
        ? `${API_BASE}/counsellor/resources/${editingResource.id}`
        : `${API_BASE}/counsellor/resources`

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to save the resource.'
        )
      }

      closeModal()
      await loadResources(false)
      showNotice(
        isEditing
          ? 'Resource updated successfully.'
          : 'Resource created successfully.'
      )
    } catch (err) {
      console.error('Resource save error:', err)
      setError(err.message || 'Unable to save the resource.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async resource => {
    try {
      setActionId(resource.id)
      setError('')

      const response = await fetch(
        `${API_BASE}/counsellor/resources/${resource.id}/status`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            is_active: !resource.is_active
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to update resource status.'
        )
      }

      setResources(previous =>
        previous.map(item =>
          item.id === resource.id
            ? data.resource
            : item
        )
      )

      showNotice(data.message)
    } catch (err) {
      console.error('Resource status error:', err)
      setError(err.message || 'Unable to update resource status.')
    } finally {
      setActionId(null)
    }
  }

  const deleteResource = async resource => {
    const confirmed = window.confirm(
      `Delete “${resource.title}”? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setActionId(resource.id)
      setError('')

      const response = await fetch(
        `${API_BASE}/counsellor/resources/${resource.id}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to delete resource.'
        )
      }

      setResources(previous =>
        previous.filter(item => item.id !== resource.id)
      )

      showNotice('Resource deleted successfully.')
    } catch (err) {
      console.error('Resource delete error:', err)
      setError(err.message || 'Unable to delete resource.')
    } finally {
      setActionId(null)
    }
  }

  const activeCount = resources.filter(
    resource => resource.is_active
  ).length

  const inactiveCount = resources.length - activeCount

  return (
    <div className="counsellor-resources-layout">
      <CounsellorSidebar />

      <main className="counsellor-resources-main">
        <div className="counsellor-resources-page">

      <header className="resource-page-header">
        <div>
          <span className="resource-kicker">
            COUNSELLOR TOOLS
          </span>
          <h1>Resource management</h1>
          <p>
            Create, update and manage wellbeing resources
            available to MindEase students.
          </p>
        </div>

        <button
          type="button"
          className="resource-add-button"
          onClick={openCreateModal}
        >
          <span>＋</span>
          Add Resource
        </button>
      </header>

      <section className="resource-summary-grid">
        <div className="resource-summary-card">
          <div className="resource-summary-icon">📚</div>
          <div>
            <span>Total resources</span>
            <strong>{resources.length}</strong>
          </div>
        </div>

        <div className="resource-summary-card active-card">
          <div className="resource-summary-icon">✓</div>
          <div>
            <span>Active</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="resource-summary-card inactive-card">
          <div className="resource-summary-icon">◌</div>
          <div>
            <span>Inactive</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>
      </section>

      <section className="resource-toolbar">
        <div className="resource-search-box">
          <span>⌕</span>
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search resources..."
          />
        </div>

        <select
          value={category}
          onChange={event => setCategory(event.target.value)}
          aria-label="Filter by category"
        >
          {CATEGORIES.map(item => (
            <option key={item} value={item}>
              {item === 'All' ? 'All categories' : item}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={event => setStatus(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          type="button"
          className="resource-refresh-button"
          onClick={() => loadResources()}
          disabled={loading}
        >
          ↻
          Refresh
        </button>
      </section>

      {notice && (
        <div className="resource-notice success">
          <span>✓</span>
          {notice}
        </div>
      )}

      {error && !modalOpen && (
        <div className="resource-notice error">
          <span>⚠</span>
          {error}
        </div>
      )}

      <section className="resource-list-section">
        <div className="resource-list-heading">
          <div>
            <span className="resource-kicker">LIBRARY</span>
            <h2>Wellbeing resources</h2>
          </div>
          <span className="resource-result-count">
            {filteredResources.length} shown
          </span>
        </div>

        {loading ? (
          <div className="resource-state">
            <div className="resource-spinner"></div>
            <h3>Loading resources...</h3>
            <p>Preparing the counsellor resource library.</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="resource-state">
            <div className="resource-state-icon">📭</div>
            <h3>No resources found</h3>
            <p>
              Try changing your filters or create a new resource.
            </p>
            <button
              type="button"
              className="resource-state-button"
              onClick={openCreateModal}
            >
              Add Resource
            </button>
          </div>
        ) : (
          <div className="resource-card-grid">
            {filteredResources.map(resource => {
              const busy = actionId === resource.id
              const categoryIcon =
                CATEGORY_ICONS[resource.category] || resource.icon || '📄'

              return (
                <article
                  className={`managed-resource-card ${
                    resource.is_active ? '' : 'is-inactive'
                  }`}
                  key={resource.id}
                >
                  <div className="managed-resource-top">
                    <div className="managed-resource-icon">
                      {categoryIcon}
                    </div>

                    <span className={`managed-status ${resource.is_active ? 'active' : 'inactive'}`}>
                      <span>●</span>
                      {resource.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="managed-resource-category">
                    {resource.category}
                  </div>

                  <h3>{resource.title}</h3>

                  <p className="managed-resource-description">
                    {resource.description}
                  </p>

                  <div className="managed-resource-type">
                    {resource.type === 'video' ? '🎥 Video resource' : '📄 Article / guide'}
                  </div>

                  <div className="managed-resource-actions">
                    <button
                      type="button"
                      className="resource-edit-button"
                      onClick={() => openEditModal(resource)}
                      disabled={busy}
                    >
                      ✎ Edit
                    </button>

                    <button
                      type="button"
                      className="resource-toggle-button"
                      onClick={() => toggleStatus(resource)}
                      disabled={busy}
                    >
                      {busy
                        ? 'Processing...'
                        : resource.is_active
                          ? 'Deactivate'
                          : 'Activate'}
                    </button>

                    <button
                      type="button"
                      className="resource-delete-button"
                      onClick={() => deleteResource(resource)}
                      disabled={busy}
                      aria-label={`Delete ${resource.title}`}
                    >
                      🗑
                    </button>
                  </div>

                  {resource.url && (
                    <a
                      className="managed-resource-link"
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open resource ↗
                    </a>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="resource-modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <div className="resource-modal" role="dialog" aria-modal="true">
            <div className="resource-modal-header">
              <div>
                <span className="resource-kicker">
                  {editingResource ? 'EDIT RESOURCE' : 'NEW RESOURCE'}
                </span>
                <h2>
                  {editingResource ? 'Update resource' : 'Add a resource'}
                </h2>
                <p>
                  Keep wellbeing information clear, supportive and student-friendly.
                </p>
              </div>

              <button
                type="button"
                className="resource-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            {error && (
              <div className="resource-form-error">
                ⚠ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="resource-form-grid">
                <label>
                  Title
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    maxLength={200}
                    placeholder="e.g. Managing exam stress"
                    required
                  />
                </label>

                <label>
                  Category
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    {CATEGORIES.filter(item => item !== 'All').map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Short description students will see first..."
                  required
                />
              </label>

              <label>
                Full content
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  rows="6"
                  placeholder="Write the full article, exercise instructions or guidance..."
                />
              </label>

              <div className="resource-form-grid">
                <label>
                  External URL <span>(optional)</span>
                  <input
                    name="url"
                    type="url"
                    value={form.url}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </label>

                <label>
                  Icon
                  <input
                    name="icon"
                    value={form.icon}
                    onChange={handleChange}
                    maxLength={10}
                    placeholder="📄"
                  />
                </label>
              </div>

              <div className="resource-modal-actions">
                <button
                  type="button"
                  className="resource-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="resource-save-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingResource
                      ? 'Save Changes'
                      : 'Create Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  )
}

export default CounsellorResources