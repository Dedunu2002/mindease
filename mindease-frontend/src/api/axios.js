// src/api/axios.js
// All React pages import axios from here
// withCredentials:true means session cookies are sent with every request
// This is how Flask knows which user is logged in

import axios from 'axios'

const api = axios.create({
  baseURL:         '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default api

// ── How to use this in a page component: ──────────────────────
// import api from '../api/axios'
//
// GET example (load data):
// const response = await api.get('/checkins')     → calls Flask /api/checkins
// const data = response.data                      → the JSON Flask sent back
//
// POST example (send data):
// const response = await api.post('/checkin', {   → calls Flask /api/checkin
//   sleep_hours: 7, stress_level: 5, ...          → sends this JSON to Flask
// })