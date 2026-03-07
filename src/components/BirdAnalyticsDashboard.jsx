import { useState } from 'react'
import './BirdAnalyticsDashboard.css'

function BirdAnalyticsDashboard({ data, onClose }) {
  const [playingId, setPlayingId] = useState(null)

  // 偵錯記錄
  console.log('BirdAnalyticsDashboard received data:', data)

  if (!data) {
    return null
  }

  // 同時支援 data.voices 與 data 兩種資料格式
  const voicesData = data.voices || data
  
  if (!voicesData || (Array.isArray(voicesData) && voicesData.length === 0)) {
    return (
      <div className="analytics-overlay">
        <div className="analytics-container">
          <button className="analytics-close-btn" onClick={onClose}>✕</button>
          <div className="analytics-header">
            <h2>No Data Available</h2>
          </div>
        </div>
      </div>
    )
  }

  // 計算鳥類統計資料
  const getBirdStats = () => {
    const stats = {}
    voicesData.forEach(voice => {
      if (!stats[voice.birdName]) {
        stats[voice.birdName] = {
          count: 0,
          avgScore: 0,
          totalScore: 0,
          occurrences: 0,
          firstSeen: voice.recordTime,
          lastSeen: voice.recordTime
        }
      }
      stats[voice.birdName].count += voice.birdCount
      stats[voice.birdName].totalScore += parseFloat(voice.birdScore) * voice.birdCount
      stats[voice.birdName].occurrences += 1
      
      // 追蹤時間範圍
      if (voice.recordTime < stats[voice.birdName].firstSeen) {
        stats[voice.birdName].firstSeen = voice.recordTime
      }
      if (voice.recordTime > stats[voice.birdName].lastSeen) {
        stats[voice.birdName].lastSeen = voice.recordTime
      }
    })

    Object.keys(stats).forEach(bird => {
      stats[bird].avgScore = (stats[bird].totalScore / stats[bird].count).toFixed(1)
    })

    return stats
  }

  // 取得數量前 5 名鳥種
  const getTop5Birds = () => {
    const stats = getBirdStats()
    return Object.entries(stats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }))
  }

  // 取得時間分佈（按小時）
  const getTimeDistribution = () => {
    const hourMap = {}
    voicesData.forEach(voice => {
      const hour = voice.recordTime.split(' ')[1]?.split(':')[0] || '00'
      hourMap[hour] = (hourMap[hour] || 0) + 1
    })

    return Object.entries(hourMap)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
  }

  const birdStats = getBirdStats()
  const top5Birds = getTop5Birds()
  const timeDistribution = getTimeDistribution()
  const totalBirds = Object.keys(birdStats).length
  const totalOccurrences = voicesData.length
  const totalCount = Object.values(birdStats).reduce((sum, bird) => sum + bird.count, 0)

  // 計算圖表配色
  const chartColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']

  return (
    <div className="analytics-overlay">
      <div className="analytics-container">
        <button className="analytics-close-btn" onClick={onClose} title="Close Analytics">
          ✕
        </button>

        <div className="analytics-header">
          <h2>🐦 Bird Analytics Dashboard</h2>
          <p className="analytics-subtitle">Monitoring Point: {data.monitor || 'N/A'}</p>
        </div>

        <div className="analytics-content">
          {/* 摘要統計 */}
          <div className="stats-summary">
            <div className="stat-card">
              <div className="stat-icon">🦜</div>
              <div className="stat-info">
                <div className="stat-value">{totalBirds}</div>
                <div className="stat-label">Bird Species</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <div className="stat-value">{totalOccurrences}</div>
                <div className="stat-label">Total Detections</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔢</div>
              <div className="stat-info">
                <div className="stat-value">{totalCount}</div>
                <div className="stat-label">Total Bird Count</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏰</div>
              <div className="stat-info">
                <div className="stat-value">{timeDistribution.length}</div>
                <div className="stat-label">Active Hours</div>
              </div>
            </div>
          </div>

          {/* 圖表網格 */}
          <div className="charts-grid">
            {/* 長條圖－時間分佈 */}
            <div className="chart-card">
              <h3>⏰ Detection Time Distribution</h3>
              <div className="bar-chart">
                {timeDistribution.map((item, idx) => {
                  const maxCount = Math.max(...timeDistribution.map(d => d.count))
                  const percentage = (item.count / maxCount) * 100
                  return (
                    <div key={item.hour} className="bar-item">
                      <div className="bar-container">
                        <div 
                          className="bar-fill"
                          style={{ height: `${percentage}%` }}
                          title={`${item.hour}: ${item.count} detections`}
                        ></div>
                      </div>
                      <div className="bar-label">{item.hour}</div>
                      <div className="bar-value">{item.count}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 圓餅圖－前 5 名鳥種 */}
            <div className="chart-card">
              <h3>🏆 Top 5 Bird Species</h3>
              <div className="pie-chart">
                <div className="pie-legend">
                  {top5Birds.map((bird, idx) => {
                    const color = chartColors[idx % chartColors.length]
                    const percentage = ((bird.count / totalCount) * 100).toFixed(1)
                    return (
                      <div key={bird.name} className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: color }}></div>
                        <div className="legend-info">
                          <div className="legend-name">{bird.name}</div>
                          <div className="legend-stats">
                            <span className="legend-count">{bird.count} birds</span>
                            <span className="legend-percent">{percentage}%</span>
                            <span className="legend-confidence">{bird.avgScore}% conf.</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 出現次數長條圖 */}
            <div className="chart-card">
              <h3>📈 Species Detection Frequency</h3>
              <div className="horizontal-bar-chart">
                {top5Birds.map((bird, idx) => {
                  const maxOccurrences = Math.max(...top5Birds.map(b => b.occurrences))
                  const percentage = (bird.occurrences / maxOccurrences) * 100
                  const color = chartColors[idx % chartColors.length]
                  return (
                    <div key={bird.name} className="h-bar-item">
                      <div className="h-bar-label">{bird.name}</div>
                      <div className="h-bar-container">
                        <div 
                          className="h-bar-fill"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: color
                          }}
                        >
                          <span className="h-bar-value">{bird.occurrences}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 近期偵測 */}
            <div className="chart-card">
              <h3>🔴 Recent Detections</h3>
              <div className="recent-list">
                {voicesData.slice(0, 8).map((voice, idx) => (
                  <div key={idx} className="recent-item">
                    <div className="recent-time">{voice.recordTime.split(' ')[1]}</div>
                    <div className="recent-bird">{voice.birdName}</div>
                    <div className="recent-count">×{voice.birdCount}</div>
                    <div className="recent-score">{voice.birdScore}%</div>
                    {voice.soundUrl && (
                      <button
                        className={`recent-play ${playingId === voice.id ? 'playing' : ''}`}
                        onClick={() => {
                          setPlayingId(voice.id)
                          const audio = new Audio(voice.soundUrl)
                          audio.play().catch(err => console.error('Play failed:', err))
                          audio.onended = () => setPlayingId(null)
                        }}
                      >
                        ▶
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 詳細物種表格 */}
          <div className="species-table-card">
            <h3>📋 All Species Summary</h3>
            <div className="species-table-wrapper">
              <table className="species-table">
                <thead>
                  <tr>
                    <th>Species</th>
                    <th>Total Count</th>
                    <th>Detections</th>
                    <th>Avg Confidence</th>
                    <th>First Seen</th>
                    <th>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(birdStats)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([name, stats]) => (
                      <tr key={name}>
                        <td className="species-name">{name}</td>
                        <td className="species-count">{stats.count}</td>
                        <td className="species-occurrences">{stats.occurrences}</td>
                        <td className="species-score">{stats.avgScore}%</td>
                        <td className="species-time">{stats.firstSeen.split(' ')[1]}</td>
                        <td className="species-time">{stats.lastSeen.split(' ')[1]}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BirdAnalyticsDashboard
