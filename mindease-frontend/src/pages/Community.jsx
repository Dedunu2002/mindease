// src/pages/Community.jsx
import { useState, useEffect, useRef } from 'react'
import api                             from '../api/axios'
import '../styles/Community.css'

const REACTIONS = [
  { key:'heart', emoji:'💙', label:'Heart'  },
  { key:'star',  emoji:'⭐', label:'Star'   },
  { key:'hug',   emoji:'🤗', label:'Hug'    },
]

// ── Individual Post Card ───────────────────────────────────────
function PostCard({ post, onReact, onFlag, onDelete }) {
  const [flagged,   setFlagged]   = useState(false)
  const [showFlag,  setShowFlag]  = useState(false)

  const handleFlag = async () => {
    setFlagged(true)
    setShowFlag(false)
    try {
      await api.post(`/posts/${post.id}/flag`)
      onFlag(post.id)
    } catch { setFlagged(false) }
  }

  if (flagged) return null

  return (
    <div className="post-card">

      {/* Post header */}
      <div className="post-header">
        <div className="post-avatar">🙂</div>
        <div>
          <p className="post-author">Anonymous Student</p>
          <p className="post-time">{post.created_at}</p>
        </div>
        <div className="post-menu">
          {post.is_own ? (
            <button
              className="post-delete-btn"
              onClick={() => onDelete(post.id)}
              title="Delete your post"
            >🗑</button>
          ) : (
            <div className="flag-wrap">
              <button
                className="post-flag-btn"
                onClick={() => setShowFlag(!showFlag)}
                title="Report this post"
              >⚑</button>
              {showFlag && (
                <div className="flag-confirm">
                  <p>Report this post as harmful?</p>
                  <button className="btn-danger-sm" onClick={handleFlag}>Yes, report</button>
                  <button className="btn-cancel-sm"
                    onClick={() => setShowFlag(false)}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post content */}
      <p className="post-content">{post.content}</p>

      {/* Emoji reactions */}
      <div className="post-reactions">
        {REACTIONS.map(r => {
          const active = post.user_reactions?.includes(r.key)
          const count  = post.reactions?.[r.key] || 0
          return (
            <button
              key={r.key}
              className={`reaction-btn ${active ? 'active' : ''}`}
              onClick={() => onReact(post.id, r.key)}
              title={r.label}
            >
              {r.emoji}
              {count > 0 && <span className="reaction-count">{count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Community Page ────────────────────────────────────────
export default function Community() {
  const [posts,     setPosts]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [newPost,   setNewPost]   = useState('')
  const [posting,   setPosting]   = useState(false)
  const [postError, setPostError] = useState('')
  const textareaRef = useRef(null)

  const MAX_CHARS = 500

  useEffect(() => {
    api.get('/posts')
      .then(res  => setPosts(res.data))
      .catch(()  => {})
      .finally(() => setLoading(false))
  }, [])

  // Submit a new post
  const handlePost = async (e) => {
    e.preventDefault()
    if (!newPost.trim()) return
    setPostError('')
    setPosting(true)
    try {
      const res = await api.post('/posts', { content: newPost.trim() })
      setPosts(prev => [res.data, ...prev])
      setNewPost('')
    } catch (err) {
  console.error('Community post error:', err)

  console.error('Response:', err.response)
  console.error('Response data:', err.response?.data)
  console.error('Status:', err.response?.status)

  setPostError(
    err.response?.data?.error ||
    `Could not post. Server returned ${err.response?.status || 'an unknown error'}.`
  )
} finally {
      setPosting(false)
    }
  }

  // Optimistic reaction toggle
  const handleReact = async (postId, emoji) => {
    // 1. Update UI immediately (optimistic)
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const alreadyReacted = p.user_reactions?.includes(emoji)
      return {
        ...p,
        reactions: {
          ...p.reactions,
          [emoji]: alreadyReacted
            ? Math.max(0, (p.reactions[emoji] || 0) - 1)
            : (p.reactions[emoji] || 0) + 1
        },
        user_reactions: alreadyReacted
          ? p.user_reactions.filter(e => e !== emoji)
          : [...(p.user_reactions || []), emoji]
      }
    }))

    // 2. Send to Flask in background, update with real data
    try {
      const res = await api.post(`/posts/${postId}/react`, { emoji })
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p))
    } catch {
      // Revert optimistic update on error by refetching
      api.get('/posts').then(r => setPosts(r.data)).catch(()=>{})
    }
  }

  // Remove flagged post from local list
  const handleFlag = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  // Delete own post
  const handleDelete = async (postId) => {
    if (!window.confirm('Delete your post?')) return
    try {
      await api.delete(`/posts/${postId}`)
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch {
      alert('Could not delete post.')
    }
  }

  return (
    <div className="page-wrapper">

      <div className="community-header">
        <h1>🌍 Community Board</h1>
        <p>Share how you're feeling, offer tips, or just let it out. All posts are completely anonymous.</p>
      </div>

      {/* Post composer */}
      <div className="post-composer card">
        <div className="composer-header">
          <span className="composer-avatar">🙂</span>
          <span className="composer-anon-label">Posting anonymously</span>
        </div>
        <textarea
          ref={textareaRef}
          placeholder="Share how you're feeling, a coping tip, or anything on your mind..."
          value={newPost}
          onChange={e => setNewPost(e.target.value.slice(0, MAX_CHARS))}
          rows={3}
          className="composer-textarea"
        />
        {postError && <div className="alert-error">{postError}</div>}
        <div className="composer-footer">
          <span
            className={`char-count ${newPost.length >= MAX_CHARS ? 'limit' : ''}`}
          >
            {newPost.length}/{MAX_CHARS}
          </span>
          <button
            className="btn-primary"
            onClick={handlePost}
            disabled={posting || !newPost.trim()}
          >
            {posting ? 'Posting...' : 'Post Anonymously 🌍'}
          </button>
        </div>
        <p className="composer-note">
          🔒 Your name is never shown. Be kind — posts flagged as harmful are reviewed by counsellors.
        </p>
      </div>

      {/* Posts list */}
      <div className="posts-list">
        {loading ? (
          <div className="posts-loading">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="posts-empty">
            <span>🌱</span>
            <p>No posts yet. Be the first to share something.</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onReact={handleReact}
              onFlag={handleFlag}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}