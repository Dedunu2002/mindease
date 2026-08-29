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


  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    })

  }, [messages])


  // ============================================================
  // SEND MESSAGE
  // ============================================================

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


  // ============================================================
  // KEYBOARD HANDLER
  // ============================================================

  const handleKeyDown = (e) => {

    // Enter = send
    // Shift + Enter = new line

    if (e.key === 'Enter' && !e.shiftKey) {

      e.preventDefault()

      sendMessage()

    }

  }


  // ============================================================
  // CLEAR CHAT / NEW CHAT
  // ============================================================

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


  // ============================================================
  // UI
  // ============================================================

  return (

    <div className="chat-page">


      {/* ======================================================
          CHAT HEADER
      ====================================================== */}

      <div className="chat-header">

        <div className="chat-header-info">

          <div className="chat-avatar">
            💚
          </div>


          <div className="chat-header-text">

            <h2>
              MindBot
            </h2>

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
            type="button"
          >

            <span className="new-chat-icon">
              ✨
            </span>

            New chat

          </button>

        </div>

      </div>



      {/* ======================================================
          DISCLAIMER
      ====================================================== */}

      <div className="chat-disclaimer">

        <span className="disclaimer-icon">
          🛡️
        </span>

        <span className="disclaimer-text">
          MindBot is an AI support tool — not a medical service.
        </span>

        <Link
          to="/booking"
          className="counsellor-link"
        >
          Book a counsellor appointment
          <span className="link-arrow">
            →
          </span>
        </Link>

      </div>



      {/* ======================================================
          CRISIS BANNER
      ====================================================== */}

      {isCrisis && (

        <div className="crisis-banner">

          <div className="crisis-content">

            <div className="crisis-icon">
              🆘
            </div>

            <div>

              <strong>
                Immediate Support Available
              </strong>

              <span>
                Please contact the Sri Lanka Crisis Support Line: 1926
              </span>

            </div>

          </div>


          <Link
            to="/booking"
            className="crisis-book-btn"
          >
            Book Counsellor
            <span>→</span>
          </Link>

        </div>

      )}



      {/* ======================================================
          CHAT MESSAGES
      ====================================================== */}

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
              className={`chat-message-content ${
                msg.role === 'user'
                  ? 'user-message-content'
                  : 'bot-message-content'
              }`}
            >

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


              <span className="message-label">

                {msg.role === 'user'
                  ? 'You'
                  : 'MindBot'
                }

              </span>

            </div>

          </div>

        ))}



        {/* ==================================================
            TYPING INDICATOR
        ================================================== */}

        {loading && (

          <div className="chat-bubble-wrap bot-wrap">

            <div className="bot-avatar">
              💚
            </div>

            <div className="chat-message-content">

              <div className="chat-bubble bot-bubble typing-bubble">

                <span className="typing-dot"></span>

                <span className="typing-dot"></span>

                <span className="typing-dot"></span>

              </div>

            </div>

          </div>

        )}



        {/* Auto-scroll target */}

        <div ref={bottomRef} />

      </div>



      {/* ======================================================
          SUGGESTED TOPICS
      ====================================================== */}

      {showSuggest && (

        <div className="chat-suggestions">

          <div className="suggest-header">

            <div className="suggest-icon">
              ✨
            </div>

            <div>

              <p className="suggest-label">
                Suggested topics
              </p>

              <span className="suggest-description">
                Start a conversation with one of these
              </span>

            </div>

          </div>


          <div className="suggest-chips">

            {SUGGESTIONS.map((suggestion, i) => (

              <button
                key={i}
                className="suggest-chip"
                onClick={() => sendMessage(suggestion)}
                disabled={loading}
                type="button"
              >

                <span className="suggest-chip-arrow">
                  →
                </span>

                <span>
                  {suggestion}
                </span>

              </button>

            ))}

          </div>

        </div>

      )}



      {/* ======================================================
          INPUT AREA
      ====================================================== */}

      <div className="chat-input-area">

        <div className="chat-input-wrapper">

          <textarea
            className="chat-input"
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
          />

        </div>


        <button
          className="chat-send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          type="button"
          aria-label="Send message"
        >

          {loading ? (

            <span className="send-loading">
              ...
            </span>

          ) : (

            <span className="send-icon">
              ↑
            </span>

          )}

        </button>

      </div>


    </div>

  )

}