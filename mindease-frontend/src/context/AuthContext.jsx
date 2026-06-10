// src/context/AuthContext.jsx
// This file creates a "global user store" for the whole app.
// Any page can read currentUser by importing useAuth()

import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

// Step 1: Create the context (the global store)
const AuthContext = createContext(null)

// Step 2: Create the Provider (wraps the whole app — see main.jsx)
export function AuthProvider({ children }) {

  // currentUser holds: { id, name, role } or null if not logged in
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading]         = useState(true)
  // loading = true while we check if user is still logged in on page refresh

  // Step 3: On every page load/refresh — ask Flask "is someone logged in?"
  useEffect(() => {
    api.get('/me')
      .then(res  => setCurrentUser(res.data))   // logged in — store user
      .catch(()  => setCurrentUser(null))        // not logged in — clear
      .finally(() => setLoading(false))          // done checking
  }, [])   // empty [] means "run once when app first loads"

  // Step 4: login() — called after successful POST /api/login
  const login = (userData) => {
    setCurrentUser(userData)
  }

  // Step 5: logout() — clears user from context + calls Flask logout
  const logout = async () => {
    try {
      await api.post('/logout')
    } finally {
      setCurrentUser(null)
    }
  }

  // While checking login status — show nothing (prevents flash of login page)
  if (loading) {
    return (
      <div style={{ display:'flex', justifyContent:'center',
                       alignItems:'center', height:'100vh',
                       color:'#1A7A5E', fontSize:'18px' }}>
        Loading MindEase...
      </div>
    )
  }

  // Step 6: Provide the values to every child component
  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Step 7: Custom hook — any page imports useAuth() to get currentUser
export function useAuth() {
  return useContext(AuthContext)
}

// ── How to use in any page ────────────────────────────────────
// import { useAuth } from '../context/AuthContext'
// const { currentUser, login, logout } = useAuth()
// currentUser.name → "Hasaru"
// currentUser.role → "student"