// src/pages/Resources.jsx
import { useState, useEffect } from 'react'
import api                    from '../api/axios'
import '../styles/Resources.css'

// Category config
const CATEGORIES = [
  { label:'All',        icon:'📚' },
  { label:'Anxiety',     icon:'😰' },
  { label:'Sleep',       icon:'😴' },
  { label:'Stress',      icon:'⚡' },
  { label:'Motivation',  icon:'🎯' },
  { label:'Loneliness',  icon:'🤝' },
]

// Category background colours
const CAT_COLOURS = {
  Anxiety:    '#FAEEDA',
  Sleep:      '#E6F1FB',
  Stress:     '#FAECE7',
  Motivation: '#EAF3DE',
  Loneliness: '#F3E8FF',
}

export default function Resources() {
  const [allResources,    setAllResources]    = useState([])
  const [activeCategory,  setActiveCategory]  = useState('All')
  const [searchTerm,      setSearchTerm]      = useState('')
  const [loading,         setLoading]         = useState(true)
  const [expanded,        setExpanded]        = useState(null) // expanded card id

  useEffect(() => {
    api.get('/resources')
      .then(res  => setAllResources(res.data))
      .catch(()  => setAllResources([]))
      .finally(() => setLoading(false))
  }, [])

  // Filter resources by category + search term
  // This runs every render — no need for extra state
  const filtered = allResources.filter(r => {
    const matchesCat    = activeCategory === 'All' || r.category === activeCategory
    const matchesSearch = !searchTerm ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="page-wrapper">

      {/* Header */}
      <div className="res-header">
        <div>
          <h1>📚 Wellness Resources</h1>
          <p>Articles, tips and guides to support your mental wellbeing</p>
        </div>

        {/* Search bar */}
        <div className="res-search">
          <span className="res-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="res-search-input"
          />
          {searchTerm && (
            <button className="res-search-clear"
              onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>
      </div>

      {/* Category filter buttons */}
      <div className="res-filters">
        {CATEGORIES.map(cat => (
          <button
            key={cat.label}
            className={`res-filter-btn ${activeCategory === cat.label ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.label)}
          >
            {cat.icon} {cat.label}
            {activeCategory === cat.label && cat.label !== 'All' && (
              <span className="filter-count">
                {allResources.filter(r => r.category === cat.label).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="res-count">
        {loading ? 'Loading resources...' : `Showing ${filtered.length} resource${filtered.length !== 1 ? 's' : ''}`}
      </p>

      {/* Resource cards grid */}
      {loading ? (
        <div className="res-grid">
          {[...Array(6)].map((_,i) => (
            <div key={i} className="res-card res-skeleton"></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="res-empty">
          <span>🔍</span>
          <h3>No resources found</h3>
          <p>Try a different category or search term.</p>
          <button className="btn-secondary"
            onClick={() => { setActiveCategory('All'); setSearchTerm(''); }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="res-grid">
          {filtered.map(resource => (
            <div
              key={resource.id}
              className={`res-card ${expanded === resource.id ? 'expanded' : ''}`}
              style={{ background: CAT_COLOURS[resource.category] || 'white' }}
            >
              <div className="res-card-header">
                <span className="res-card-icon">{resource.icon}</span>
                <span className="res-cat-badge">{resource.category}</span>
              </div>

              <h3 className="res-card-title">{resource.title}</h3>
              <p  className="res-card-desc">{resource.description}</p>

              {/* Expanded content */}
              {expanded === resource.id && resource.content && (
                <div className="res-card-content">
                  <p>{resource.content}</p>
                </div>
              )}

              <div className="res-card-footer">
                <button
                  className="res-read-btn"
                  onClick={() => setExpanded(expanded === resource.id ? null : resource.id)}
                >
                  {expanded === resource.id ? 'Show less ↑' : 'Read more ↓'}
                </button>
                {resource.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="res-ext-link"
                  >
                    External link ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}