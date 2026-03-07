import { useState, useEffect } from 'react'
import { fetchVoiceData } from '../services/cctvApi'
import './CCTVDashboard.css'

function CCTVDashboard({ onViewAnalytics }) {
  const [startTime, setStartTime] = useState(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 16))
  const [endTime, setEndTime] = useState(new Date().toISOString().slice(0, 16))
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
        const testParams = {
          StartTime: new Date(new Date().setDate(new Date().getDate() - 1))
            .toISOString()
            .replace('T', ' ')
            .slice(0, 19),
          EndTime: new Date()
            .toISOString()
            .replace('T', ' ')
            .slice(0, 19),
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

  // 依 API 要求格式化時間
  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr)
    return date.toISOString().replace('T', ' ').slice(0, 19)
  }

  // 取得 CCTV 資料
  const fetchCCTVData = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        StartTime: formatDateTime(startTime),
        EndTime: formatDateTime(endTime),
        StartIndex: parseInt(startIndex),
        EndIndex: parseInt(endIndex)
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
        errorMsg = '🛑 CORS Error: Please ensure the development server is running (npm run dev)'
      } else if (err.message.includes('fetch')) {
        errorMsg = '🛑 Network Error: Cannot connect to API server'
      } else if (err.message.includes('JSON')) {
        errorMsg = '🛑 API Response Error: Incorrect data format returned'
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
    fetchCCTVData()
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
          occurrences: 0
        }
      }
      stats[voice.birdName].count += voice.birdCount
      stats[voice.birdName].totalScore += parseFloat(voice.birdScore) * voice.birdCount
      stats[voice.birdName].occurrences += 1
    })

    // 計算平均分數
    Object.keys(stats).forEach(bird => {
      stats[bird].avgScore = (stats[bird].totalScore / stats[bird].count).toFixed(1)
    })

    return stats
  }

  const birdStats = getBirdStats()

  return (
    <div className="cctv-dashboard">
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
              ❌ API Connection Failed - Please ensure npm run dev is running
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
                  value={startIndex}
                  onChange={(e) => setStartIndex(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>End Index (Max 1000)</label>
                <input
                  type="number"
                  max="1000"
                  value={endIndex}
                  onChange={(e) => setEndIndex(Math.min(1000, parseInt(e.target.value) || 0))}
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
            {onViewAnalytics && (
              <button 
                className="view-analytics-btn" 
                onClick={() => onViewAnalytics(data)}
              >
                📊 View Analytics Dashboard
              </button>
            )}
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

export default CCTVDashboard
