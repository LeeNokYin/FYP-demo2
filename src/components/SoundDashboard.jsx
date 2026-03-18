import { useState, useEffect } from 'react'
import { fetchVoiceData } from '../services/voiceApi'
import './SoundDashboard.css'

const toDatetimeLocalValue = (date) => {
  const pad = (value) => `${value}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const toApiDateTime = (dateTimeStr) => {
  const date = new Date(dateTimeStr)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const pad = (value) => `${value}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function SoundDashboard() {
  const initialEnd = new Date()
  const initialStart = new Date(initialEnd)
  initialStart.setDate(initialStart.getDate() - 1)

  const [startTime, setStartTime] = useState(toDatetimeLocalValue(initialStart))
  const [endTime, setEndTime] = useState(toDatetimeLocalValue(initialEnd))
  const [startIndex, setStartIndex] = useState(0)
  const [endIndex, setEndIndex] = useState(100)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [expandedVoice, setExpandedVoice] = useState(null)
  const [playingId, setPlayingId] = useState(null)
  const [apiStatus, setApiStatus] = useState(null) // 可能值：'connected'、'error'、null

  useEffect(() => {
    // 檢查 API 連線狀態
    const checkConnection = async () => {
      try {
        const probeEnd = new Date()
        const probeStart = new Date(probeEnd)
        probeStart.setDate(probeStart.getDate() - 1)

        const testParams = {
          StartTime: toApiDateTime(toDatetimeLocalValue(probeStart)),
          EndTime: toApiDateTime(toDatetimeLocalValue(probeEnd)),
          StartIndex: 0,
          EndIndex: 1
        }
        
        const result = await fetchVoiceData(testParams)
        setApiStatus(result.success ? 'connected' : 'error')
      } catch (err) {
        setApiStatus('error')
        console.log('API connection check:', err.message)
      }
    }

    checkConnection()
  }, [])

  // 取得 Voice 資料
  const fetchSoundDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const formattedStart = toApiDateTime(startTime)
      const formattedEnd = toApiDateTime(endTime)
      const parsedStartIndex = parseInt(startIndex, 10)
      const parsedEndIndex = parseInt(endIndex, 10)

      if (!formattedStart || !formattedEnd) {
        setError('StartTime/EndTime format is invalid. Expected yyyy-MM-dd HH:mm:ss.')
        setData(null)
        return
      }

      if (Number.isNaN(parsedStartIndex) || Number.isNaN(parsedEndIndex)) {
        setError('StartIndex and EndIndex are required.')
        setData(null)
        return
      }

      if (parsedStartIndex < 0 || parsedEndIndex < 0 || parsedStartIndex > 1000 || parsedEndIndex > 1000) {
        setError('StartIndex / EndIndex must be between 0 and 1000.')
        setData(null)
        return
      }

      if (parsedStartIndex > parsedEndIndex) {
        setError('StartIndex cannot be greater than EndIndex.')
        setData(null)
        return
      }

      const payload = {
        StartTime: formattedStart,
        EndTime: formattedEnd,
        StartIndex: parsedStartIndex,
        EndIndex: parsedEndIndex
      }

      const result = await fetchVoiceData(payload)

      if (!result.success) {
        setError(result.errorMessage || 'Unknown Error')
        setData(null)
      } else {
        setData(result)
      }
    } catch (err) {
      // 提供更友善的錯誤訊息
      let errorMsg = err.message
      if (err.message.includes('CORS')) {
        errorMsg = 'CORS Error: Production requires a backend/proxy that allows your GitHub Pages origin.'
      } else if (err.message.includes('fetch')) {
        errorMsg = 'Network Error: Cannot connect to API server'
      } else if (err.message.includes('JSON')) {
        errorMsg = 'API Response Error: Incorrect data format returned'
      }
      setError(errorMsg)
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // 處理搜尋按鈕點擊
  const handleSearch = (e) => {
    e.preventDefault()
    fetchSoundDashboardData()
  }

  // 計算鳥類出現統計
  const getBirdStats = () => {
    if (!data?.voices) return {}
    
    const stats = {}
    data.voices.forEach(voice => {
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

      if (voice.recordTime < stats[voice.birdName].firstSeen) {
        stats[voice.birdName].firstSeen = voice.recordTime
      }
      if (voice.recordTime > stats[voice.birdName].lastSeen) {
        stats[voice.birdName].lastSeen = voice.recordTime
      }
    })

    // 計算平均分數
    Object.keys(stats).forEach(bird => {
      stats[bird].avgScore = (stats[bird].totalScore / stats[bird].count).toFixed(1)
    })

    return stats
  }

  const birdStats = getBirdStats()
  const voicesData = data?.voices || []
  const top5Birds = Object.entries(birdStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, stats]) => ({ name, ...stats }))
  const timeDistribution = Object.entries(
    voicesData.reduce((hourMap, voice) => {
      const hour = voice.recordTime?.split(' ')[1]?.split(':')[0] || '00'
      hourMap[hour] = (hourMap[hour] || 0) + 1
      return hourMap
    }, {})
  )
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour))
  const totalBirds = Object.keys(birdStats).length
  const totalOccurrences = voicesData.length
  const totalCount = Object.values(birdStats).reduce((sum, bird) => sum + bird.count, 0)
  const chartColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']

  return (
    <div className="voice-dashboard">
      <div className="dashboard-container">
        {/* API 連線狀態 */}
        <div className="api-status">
          {apiStatus === 'connected' && (
            <div className="status-indicator success">
              ✅ API Connected
            </div>
          )}
          {apiStatus === 'error' && (
            <div className="status-indicator error">
              API connection failed. GitHub Pages needs API CORS allow-listing or a backend proxy.
            </div>
          )}
          {apiStatus === null && (
            <div className="status-indicator loading">
              ⏳ Checking API connection...
            </div>
          )}
        </div>

        {/* 搜尋面板 */}
        <div className="search-panel">
          <h2>🎤 Voice Detection Data Query</h2>
          
          <form onSubmit={handleSearch} className="search-form">
            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Index</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={startIndex}
                  onChange={(e) => setStartIndex(Math.max(0, Math.min(1000, parseInt(e.target.value, 10) || 0)))}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Index (Max 1000)</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={endIndex}
                  onChange={(e) => setEndIndex(Math.max(0, Math.min(1000, parseInt(e.target.value, 10) || 0)))}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="search-btn">
              {loading ? '⏳ Loading...' : '🔍 Search'}
            </button>
          </form>

          {error && <div className="error-message">❌ {error}</div>}
        </div>

        {/* 統計面板 */}
        {data && (
          <div className="stats-panel">
            <h3>📊 Monitoring Statistics</h3>
            <div className="stats-info">
              <div className="stat-item">
                <span className="label">Monitoring Point:</span>
                <span className="value">{data.monitor}</span>
              </div>
              <div className="stat-item">
                <span className="label">Total Records:</span>
                <span className="value">{data.totalLength}</span>
              </div>
              <div className="stat-item">
                <span className="label">Query Range:</span>
                <span className="value">{data.startIndex} - {data.endIndex}</span>
              </div>
              <div className="stat-item">
                <span className="label">Bird Species Found:</span>
                <span className="value">{Object.keys(birdStats).length}</span>
              </div>
            </div>
          </div>
        )}

        {/* 合併後的 Sound Sensor 分析區塊 */}
        {voicesData.length > 0 && (
          <div className="analytics-content">
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

            <div className="charts-grid">
              <div className="chart-card">
                <h3>⏰ Detection Time Distribution</h3>
                <div className="bar-chart">
                  {timeDistribution.map((item) => {
                    const maxCount = Math.max(...timeDistribution.map((distribution) => distribution.count))
                    const percentage = maxCount ? (item.count / maxCount) * 100 : 0
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

              <div className="chart-card">
                <h3>🏆 Top 5 Bird Species</h3>
                <div className="pie-chart">
                  <div className="pie-legend">
                    {top5Birds.map((bird, idx) => {
                      const color = chartColors[idx % chartColors.length]
                      const percentage = totalCount ? ((bird.count / totalCount) * 100).toFixed(1) : '0.0'
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

              <div className="chart-card">
                <h3>📈 Species Detection Frequency</h3>
                <div className="horizontal-bar-chart">
                  {top5Birds.map((bird, idx) => {
                    const maxOccurrences = Math.max(...top5Birds.map((entry) => entry.occurrences))
                    const percentage = maxOccurrences ? (bird.occurrences / maxOccurrences) * 100 : 0
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
                            audio.play().catch((playError) => console.error('Play failed:', playError))
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
                          <td className="species-time">{stats.firstSeen?.split(' ')[1] || '-'}</td>
                          <td className="species-time">{stats.lastSeen?.split(' ')[1] || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 鳥類統計面板 */}
        {Object.keys(birdStats).length > 0 && (
          <div className="bird-stats-panel">
            <h3>🐦 Bird Statistics</h3>
            <div className="bird-list">
              {Object.entries(birdStats)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([birdName, stats]) => (
                  <div key={birdName} className="bird-item">
                    <div className="bird-header">
                      <span className="bird-name">{birdName}</span>
                      <span className="bird-count">{stats.count} times</span>
                      <span className="bird-score">{stats.avgScore}% confidence</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 詳細資料表格 */}
        {data?.voices && data.voices.length > 0 && (
          <div className="data-table-panel">
            <h3>🔊 Detailed Records ({data.voices.length} items)</h3>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Bird Name</th>
                    <th>Confidence</th>
                    <th>Count</th>
                    <th>Audio</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.voices.map((voice) => (
                    <tr key={voice.id} className={expandedVoice === voice.id ? 'expanded' : ''}>
                      <td>{voice.recordTime}</td>
                      <td>{voice.birdName}</td>
                      <td>
                        <div className="score-bar">
                          <div
                            className="score-fill"
                            style={{ width: voice.birdScore }}
                          ></div>
                          <span className="score-text">{voice.birdScore}</span>
                        </div>
                      </td>
                      <td>{voice.birdCount}</td>
                      <td>
                        {voice.soundUrl && (
                          <button
                            className={`play-btn ${playingId === voice.id ? 'playing' : ''}`}
                            onClick={() => {
                              setPlayingId(voice.id)
                              const audio = new Audio(voice.soundUrl)
                              audio.play().catch(err => console.error('Play failed:', err))
                              audio.onended = () => setPlayingId(null)
                            }}
                            title="Play Audio"
                          >
                            ▶️
                          </button>
                        )}
                      </td>
                      <td>
                        <button
                          className="expand-btn"
                          onClick={() => setExpandedVoice(expandedVoice === voice.id ? null : voice.id)}
                        >
                          {expandedVoice === voice.id ? '▼' : '▶'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 空狀態 */}
        {data && data.voices && data.voices.length === 0 && (
          <div className="empty-state">
            <p>🔍 No records found</p>
            <p className="hint">Please adjust the date range or index range</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SoundDashboard
