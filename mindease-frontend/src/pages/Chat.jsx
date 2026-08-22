// src/pages/Chat.jsx

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import '../styles/Chat.css'

const SUGGESTIONS = [
  "I'm really stressed about my exams 😰",
  "I can't sleep because of university pressure",
  "I feel lonely and disconnected from everyone",
  "I don't know how to manage my time",
  "I feel burned out and can't motivate myself",
]

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content:
        "Hello! I'm MindBot 💚 I'm here to listen and support you. " +
        "How are you feeling today? Feel free to share anything on your mind.",
    }
  ])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isCrisis, setIsCrisis] = useState(false)
  const [showSuggest, setShowSuggest] = useState(true)

  const bottomRef = useRef(null)

  // Automatically scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    })
  }, [messages])

  const sendMessage = async (text) => {
    const msg = (text || input).trim()

    if (!msg || loading) return

    setShowSuggest(false)
    setInput('')
    setLoading(true)

    // Immediately display student's message
    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        content: msg
      }
    ])

    try {
      const res = await api.post('/chat', {
        message: msg
      })

      // Display MindBot response
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          content: res.data.reply,
          is_crisis: res.data.is_crisis
        }
      ])

      if (res.data.is_crisis) {
        setIsCrisis(true)
      }

    } catch (error) {
      console.error('MindBot error:', error)

      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          content:
            "I'm having trouble connecting right now. " +
            "Please try again in a moment."
        }
      ])

    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    // Enter = send
    // Shift + Enter = new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = async () => {
    const confirmed = window.confirm(
      'Start a new conversation? This will clear the current chat.'
    )

    if (!confirmed) return

    try {
      await api.post('/chat/clear')
    } catch (error) {
      console.error('Could not clear chat:', error)
    }

    setMessages([
      {
        role: 'bot',
        content:
          "Hello again! I'm MindBot 💚 How are you feeling today?"
      }
    ])

    setIsCrisis(false)
    setShowSuggest(true)
  }

  return (
    <div className="chat-page">

      {/* Chat header */}
      <div className="chat-header">

        <div className="chat-header-info">

          <div className="chat-avatar">
            💚
          </div>

          <div>
            <h2>MindBot</h2>

            <p>
              <span className="online-dot"></span>
              AI Wellness Support · Available 24/7
            </p>
          </div>

        </div>

        <div className="chat-header-actions">

          <button
            className="chat-clear-btn"
            onClick={clearChat}
          >
            New chat
          </button>

        </div>

      </div>


      {/* Disclaimer */}
      <div className="chat-disclaimer">

        🛡 MindBot is an AI support tool — not a medical service.

        {' '}

        <Link to="/booking">
          Book a counsellor appointment
        </Link>

      </div>


      {/* Crisis banner */}
      {isCrisis && (
        <div className="crisis-banner">

          <strong>
            🆘 Immediate Support Available
          </strong>

          <span>
            Please contact the Sri Lanka Crisis Support Line: 1333
          </span>

          <Link
            to="/booking"
            className="crisis-book-btn"
          >
            Book Counsellor
          </Link>

        </div>
      )}


      {/* Messages */}
      <div className="chat-messages">

        {messages.map((msg, i) => (

          <div
            key={i}
            className={`chat-bubble-wrap ${
              msg.role === 'user'
                ? 'user-wrap'
                : 'bot-wrap'
            }`}
          >

            {msg.role === 'bot' && (
              <div className="bot-avatar">
                💚
              </div>
            )}

            <div
              className={`chat-bubble ${
                msg.role === 'user'
                  ? 'user-bubble'
                  : 'bot-bubble'
              } ${
                msg.is_crisis
                  ? 'crisis-bubble'
                  : ''
              }`}
            >

              {/* Render line breaks */}
              {msg.content.split('\n').map((line, j) => (
                <span key={j}>
                  {line}

                  {j < msg.content.split('\n').length - 1 && (
                    <br />
                  )}

                </span>
              ))}

            </div>

          </div>

        ))}


        {/* Typing indicator */}
        {loading && (

          <div className="chat-bubble-wrap bot-wrap">

            <div className="bot-avatar">
              💚
            </div>

            <div className="chat-bubble bot-bubble typing-bubble">

              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>

            </div>

          </div>

        )}


        {/* Auto-scroll target */}
        <div ref={bottomRef} />

      </div>


      {/* Suggestions */}
      {showSuggest && (

        <div className="chat-suggestions">

          <p className="suggest-label">
            Suggested topics:
          </p>

          <div className="suggest-chips">

            {SUGGESTIONS.map((suggestion, i) => (

              <button
                key={i}
                className="suggest-chip"
                onClick={() => sendMessage(suggestion)}
                disabled={loading}
              >
                {suggestion}
              </button>

            ))}

          </div>

        </div>

      )}


      {/* Input */}
      <div className="chat-input-area">

        <textarea
          className="chat-input"
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={1}
        />

        <button
          className="chat-send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          {loading ? '...' : '↑'}
        </button>

      </div>

    </div>
  )
}