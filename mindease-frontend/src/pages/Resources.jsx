// src/pages/Resources.jsx
import { useState, useEffect } from 'react'
import api from '../api/axios'
import '../styles/Resources.css'

// Category config
const CATEGORIES = [
  { label: 'All', icon: '📚' },
  { label: 'Anxiety', icon: '😰' },
  { label: 'Sleep', icon: '😴' },
  { label: 'Stress', icon: '⚡' },
  { label: 'Motivation', icon: '🎯' },
  { label: 'Loneliness', icon: '🤝' }
]

// Category background colours
const CAT_COLOURS = {
  Anxiety: '#FAEEDA',
  Sleep: '#E6F1FB',
  Stress: '#FAECE7',
  Motivation: '#EAF3DE',
  Loneliness: '#F3E8FF'
}

const RECOMMENDED_META = [
  {
    eyebrow: 'START HERE',
    tone: 'green',
    action: 'Explore now'
  },
  {
    eyebrow: 'FOR BETTER REST',
    tone: 'blue',
    action: 'Read guide'
  },
  {
    eyebrow: 'WHEN THINGS FEEL HEAVY',
    tone: 'lavender',
    action: 'Learn more'
  }
]

export default function Resources() {
  const [allResources, setAllResources] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.get('/resources')
      .then(res => setAllResources(res.data))
      .catch(() => setAllResources([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = allResources.filter(resource => {
    const matchesCat =
      activeCategory === 'All' || resource.category === activeCategory

    const matchesSearch =
      !searchTerm ||
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesCat && matchesSearch
  })

  // Keep recommendations independent from filters/search.
  // This means the student always sees a useful starting point.
  const recommendedResources = allResources.slice(0, 3)

  return (
    <div className="page-wrapper resources-page">

      {/* =========================================================
          PAGE HEADER
      ========================================================= */}
      <header className="res-header">
        <div className="res-header-copy">
          <span className="res-page-kicker">WELLBEING LIBRARY</span>

          <h1>Wellness Resources</h1>

          <p>
            Practical articles, calming exercises and student-friendly
            guides to support your mental wellbeing.
          </p>
        </div>

        <div className="res-search">
          <span className="res-search-icon" aria-hidden="true">⌕</span>

          <input
            type="text"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="res-search-input"
            aria-label="Search resources"
          />

          {searchTerm && (
            <button
              className="res-search-clear"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </header>

      {/* =========================================================
          RECOMMENDED RESOURCES
      ========================================================= */}
      {!loading && recommendedResources.length > 0 && (
        <section className="recommended-section">

          <div className="recommended-heading">
            <div>
              <span className="section-kicker">CURATED FOR YOU</span>
              <h2>Recommended resources</h2>
              <p>
                A few gentle places to start based on common student
                wellbeing needs.
              </p>
            </div>

            <span className="recommended-count">
              {recommendedResources.length} picks
            </span>
          </div>

          <div className="recommended-grid">
            {recommendedResources.map((resource, index) => {
              const meta = RECOMMENDED_META[index] || RECOMMENDED_META[0]

              return (
                <article
                  key={`recommended-${resource.id}`}
                  className={`recommended-card recommended-${meta.tone} ${
                    index === 0 ? 'recommended-featured' : ''
                  }`}
                >
                  <div className="recommended-visual">
                    <span className="recommended-orb orb-one" />
                    <span className="recommended-orb orb-two" />

                    <div className="recommended-icon">
                      {resource.icon || '🌱'}
                    </div>

                    <span className="recommended-badge">
                      {meta.eyebrow}
                    </span>
                  </div>

                  <div className="recommended-body">
                    <span className="recommended-category">
                      {resource.category}
                    </span>

                    <h3>{resource.title}</h3>

                    <p>{resource.description}</p>

                    <button
                      className="recommended-action"
                      onClick={() => {
                        setActiveCategory('All')
                        setSearchTerm('')
                        setExpanded(resource.id)
                        document
                          .getElementById('resource-library')
                          ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                          })
                      }}
                    >
                      {meta.action}
                      <span>→</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {/* =========================================================
          FILTER BAR
      ========================================================= */}
      <section className="resource-library" id="resource-library">

        <div className="library-heading">
          <div>
            <span className="section-kicker">EXPLORE THE LIBRARY</span>
            <h2>All resources</h2>
          </div>

          <p className="res-count">
            {loading
              ? 'Loading resources...'
              : `${filtered.length} resource${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="res-filters">
          {CATEGORIES.map(cat => (
            <button
              key={cat.label}
              className={`res-filter-btn ${
                activeCategory === cat.label ? 'active' : ''
              }`}
              onClick={() => setActiveCategory(cat.label)}
            >
              <span className="filter-icon">{cat.icon}</span>
              <span>{cat.label}</span>

              {cat.label !== 'All' && (
                <span className="filter-count">
                  {allResources.filter(
                    resource => resource.category === cat.label
                  ).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* =======================================================
            RESOURCE CARDS
        ======================================================= */}
        {loading ? (
          <div className="res-grid">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="res-card res-skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="res-empty">
            <span>⌕</span>
            <h3>No resources found</h3>
            <p>Try another category or a different search term.</p>

            <button
              className="btn-secondary"
              onClick={() => {
                setActiveCategory('All')
                setSearchTerm('')
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="res-grid">
            {filtered.map(resource => (
              <article
                key={resource.id}
                className={`res-card ${
                  expanded === resource.id ? 'expanded' : ''
                }`}
                style={{
                  '--card-accent':
                    CAT_COLOURS[resource.category] || '#EAF3DE'
                }}
              >
                <div className="res-card-visual">
                  <div className="res-card-glow" />

                  <div className="res-card-icon">
                    {resource.icon || '🌱'}
                  </div>

                  <span className="res-cat-badge">
                    {resource.category}
                  </span>
                </div>

                <div className="res-card-body">
                  <h3 className="res-card-title">
                    {resource.title}
                  </h3>

                  <p className="res-card-desc">
                    {resource.description}
                  </p>

                  {expanded === resource.id && resource.content && (
                    <div className="res-card-content">
                      <p>{resource.content}</p>
                    </div>
                  )}

                  <div className="res-card-footer">
                    <button
                      className="res-read-btn"
                      onClick={() =>
                        setExpanded(
                          expanded === resource.id
                            ? null
                            : resource.id
                        )
                      }
                    >
                      {expanded === resource.id
                        ? 'Show less ↑'
                        : 'Read more →'}
                    </button>

                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="res-ext-link"
                      >
                        Open ↗
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}