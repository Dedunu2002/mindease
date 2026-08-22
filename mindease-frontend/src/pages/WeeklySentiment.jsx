// src/pages/WeeklySentiment.jsx
import { useState, useEffect } from 'react'
import { Link }               from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import api from '../api/axios'
import '../styles/WeeklySentiment.css'

const MOOD_COLOURS  = { Positive:'#00B050', Cautious:'#EF9F27', Negative:'#E24B4A' }
const EMOTION_SCORE = { joy:3, love:3, surprise:2.8, fear:2, sadness:1, anger:1.2 }
const EMOTION_EMOJI = { joy:'😊', love:'💚', surprise:'😲', fear:'😰', sadness:'😔', anger:'😤' }

function WeeklyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const c = MOOD_COLOURS[d.mood_group] || '#6B7280'
  return (
    <div style={{background:'white',border:'1px solid #E5E7EB',borderRadius:'10px',
                   padding:'10px 14px',boxShadow:'0 4px 12px rgba(0,0,0,0.10)'}}>
      <p style={{fontSize:'11px',color:'#9CA3AF',margin:'0 0 4px'}}>{d.date}</p>
      <p style={{fontSize:'16px',fontWeight:700,color:c,margin:'0 0 2px'}}>
        {EMOTION_EMOJI[d.emotion] || '🧠'} {d.emotion?.charAt(0).toUpperCase()+d.emotion?.slice(1)}
      </p>
      <p style={{fontSize:'12px',color:'#6B7280',margin:0}}>
        Mood group: {d.mood_group}
      </p>
    </div>
  )
}

export default function WeeklySentiment() {
  const [data,    setData]    = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/sentiment-weekly')
      .then(res => {
        setData(res.data.entries || [])
        setSummary(res.data.summary || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Convert entries to chart format
  const chartData = data.map(d => ({
    ...d,
    score: EMOTION_SCORE[d.emotion] || 2,
  }))

  if (loading) return (
    <div className="page-wrapper">
      <div className="ws-loading">
        <div className="chart-spinner"></div>
        <p>Loading your weekly trend...</p>
      </div>
    </div>
  )

  return (
    <div className="page-wrapper">

      {/* Header */}
      <div className="ws-header">
        <div>
          <h1>Weekly Mood Trend 📊</h1>
          <p>Your emotional pattern from journal entries this week</p>
        </div>
        <Link to="/journal" className="btn-primary">✏️ Write Today's Entry</Link>
      </div>

      {data.length === 0 ? (
        <div className="ws-empty card">
          <span>📓</span>
          <h3>No journal entries this week yet</h3>
          <p>Write a journal entry each day to see your emotional pattern here.</p>
          <Link to="/journal" className="btn-primary" style={{marginTop:'14px'}}>
            Start journalling →
          </Link>
        </div>
      ) : (
        <>
          {/* Summary stat cards */}
          {summary && (
            <div className="ws-stats">
              <div className="ws-stat-card">
                <span className="ws-stat-num" style={{color:'var(--teal)'}}>{summary.total}</span>
                <span className="ws-stat-lbl">Journal entries</span>
              </div>
              <div className="ws-stat-card">
                <span className="ws-stat-num" style={{color:'#00B050'}}>{summary.counts.Positive}</span>
                <span className="ws-stat-lbl">Positive days</span>
              </div>
              <div className="ws-stat-card">
                <span className="ws-stat-num" style={{color:'#EF9F27'}}>{summary.counts.Cautious}</span>
                <span className="ws-stat-lbl">Cautious days</span>
              </div>
              <div className="ws-stat-card">
                <span className="ws-stat-num" style={{color:'#E24B4A'}}>{summary.counts.Negative}</span>
                <span className="ws-stat-lbl">Negative days</span>
              </div>
            </div>
          )}

          {/* Bar chart */}
          <div className="card ws-chart-card">
            <div className="ws-chart-header">
              <h2>Emotional Pattern — This Week</h2>
              <div className="ws-legend">
                {Object.entries(MOOD_COLOURS).map(([label,colour]) => (
                  <div key={label} className="ws-legend-item">
                    <span style={{width:'10px',height:'10px',borderRadius:'3px',
                                  background:colour,display:'inline-block',flexShrink:0}}/>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}
                margin={{top:10,right:16,bottom:10,left:0}} barSize={38}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F4" vertical={false}/>
                {/* Dashed zone separator lines */}
                <ReferenceLine y={2.5} stroke="#00B050" strokeDasharray="4 4" strokeOpacity={0.4}/>
                <ReferenceLine y={1.5} stroke="#E24B4A" strokeDasharray="4 4" strokeOpacity={0.4}/>
                <XAxis dataKey="date"
                  tick={{fontSize:11,fill:'#9CA3AF'}}
                  tickFormatter={(d) => d.slice(5)}
                  tickLine={false} axisLine={{stroke:'#E5E7EB'}}/>
                <YAxis
                  domain={[0,3.5]} ticks={[1,2,3]}
                  tickFormatter={(v)=>({1:'Neg',2:'Caut',3:'Pos'}[v]||'')}
                  tick={{fontSize:11,fill:'#9CA3AF'}}
                  tickLine={false} axisLine={false} width={34}/>
                <Tooltip
                  content={<WeeklyTooltip />}
                  cursor={{fill:'rgba(26,122,94,0.05)'}}/>
                <Bar dataKey="score" radius={[6,6,0,0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i}
                      fill={MOOD_COLOURS[entry.mood_group] || '#9CA3AF'}
                      opacity={0.85}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Wellness tip based on dominant mood */}
          {summary?.tip && (
            <div className="ws-tip"
              style={{borderLeftColor: MOOD_COLOURS[summary.dominant] || 'var(--teal)'}}>
              <p className="ws-tip-label">
                💡 This week's wellness tip
                <span className="ws-dominant-tag"
                  style={{background: MOOD_COLOURS[summary.dominant],color:'white'}}>
                  {summary.dominant} dominant
                </span>
              </p>
              <p className="ws-tip-text">{summary.tip}</p>
              {summary.dominant !== 'Positive' && (
                <div className="ws-tip-actions">
                  <Link to="/exercises"  className="btn-secondary">🌿 Wellness Exercises</Link>
                  <Link to="/booking"    className="btn-secondary">📅 Book Counsellor</Link>
                  <Link to="/chat"       className="btn-secondary">💬 Talk to MindBot</Link>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}