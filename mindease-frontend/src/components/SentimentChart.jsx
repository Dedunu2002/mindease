// src/components/SentimentChart.jsx
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
  ResponsiveContainer,
} from 'recharts'
import api from '../api/axios'

// Colour for each mood group
const MOOD_COLOURS = {
  Positive: '#00B050',
  Cautious: '#EF9F27',
  Negative: '#E24B4A',
  Neutral:  '#9CA3AF',
}

// Map emotion to a numeric score for the Y-axis
const EMOTION_SCORE = {
  joy:3, love:3, surprise:2.5,
  fear:2,
  sadness:1, anger:1,
}

function SentimentTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const emojiMap = {
    joy:'😊', love:'💚', surprise:'😲',
    fear:'😰', sadness:'😔', anger:'😤'
  }
  const colour = MOOD_COLOURS[d.mood_group] || '#6B7280'
  return (
    <div style={{
      background:'white', border:'1px solid #E5E7EB',
      borderRadius:'10px', padding:'10px 14px',
      boxShadow:'0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <p style={{fontSize:'11px',color:'#9CA3AF',margin:'0 0 4px'}}>{d.date}</p>
      <p style={{fontSize:'15px',fontWeight:700,color:colour,margin:'0 0 2px'}}>
        {emojiMap[d.emotion] || '🧠'} {d.emotion?.charAt(0).toUpperCase() + d.emotion?.slice(1)}
      </p>
      <p style={{fontSize:'12px',color:'#6B7280',margin:0}}>{d.mood_group}</p>
    </div>
  )
}

export default function SentimentChart() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/sentiment-data')
      .then(res  => setData(res.data))
      .catch(()  => setData([]))
      .finally(() => setLoading(false))
  }, [])

  // Convert to chart format — add a numeric score for the bar height
  const chartData = data.map(d => ({
    ...d,
    score: EMOTION_SCORE[d.emotion] || 2,
  }))

  if (loading) return (
    <div className="sentiment-chart-card">
      <div style={{padding:'30px',textAlign:'center',color:'var(--gray-500)'}}>
        Loading weekly trend...
      </div>
    </div>
  )

  if (!chartData.length) return (
    <div className="sentiment-chart-card">
      <div style={{padding:'30px',textAlign:'center'}}>
        <p style={{fontSize:'13px',color:'var(--gray-500)'}}>
          📊 Write journal entries to see your weekly mood trend here.
        </p>
      </div>
    </div>
  )

  return (
    <div className="sentiment-chart-card">
      <div className="sentiment-chart-header">
        <h3>📊 Weekly Mood Trend</h3>
        <p>Emotion detected from your journal entries this week</p>
      </div>

      {/* Legend */}
      <div className="sentiment-legend">
        {Object.entries(MOOD_COLOURS).filter(([k]) => k !== 'Neutral').map(([label,colour]) => (
          <div key={label} className="legend-item">
            <span style={{width:'9px',height:'9px',borderRadius:'3px',
                          background:colour,display:'inline-block',flexShrink:0}}/>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={chartData}
          margin={{ top:5, right:10, bottom:5, left:0 }}
          barSize={32}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#F1F5F4"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize:11, fill:'#9CA3AF' }}
            tickFormatter={(d) => d.slice(5)}
            tickLine={false}
            axisLine={{ stroke:'#E5E7EB' }}
          />
          <YAxis
            domain={[0, 3.5]}
            ticks={[1, 2, 3]}
            tickFormatter={(v) => ({1:'Neg',2:'Caut',3:'Pos'}[v]||'')}
            tick={{ fontSize:11, fill:'#9CA3AF' }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            content={<SentimentTooltip />}
            cursor={{ fill:'rgba(26,122,94,0.05)' }}
          />
          <Bar
            dataKey="score"
            radius={[6, 6, 0, 0]}
          >
            {/* Each bar gets its own colour based on mood_group */}
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={MOOD_COLOURS[entry.mood_group] || MOOD_COLOURS.Neutral}
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}