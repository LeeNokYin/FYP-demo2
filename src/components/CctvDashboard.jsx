import { useMemo, useState } from 'react'
import { fetchLatestCctvImage } from '../services/voiceApi'
import './SoundDashboard.css'
import './CctvDashboard.css'

const MEDIA_TYPES = ['images', 'detected_images']

const formatToday = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = `${now.getMonth() + 1}`.padStart(2, '0')
  const d = `${now.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatDateTimeLocal = (date, hh = '00', mm = '00', ss = '00') => {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`
}

const toApiDateTime = (dateTimeStr) => {
  const date = new Date(dateTimeStr)
  if (Number.isNaN(date.getTime())) return null

  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  const hh = `${date.getHours()}`.padStart(2, '0')
  const mm = `${date.getMinutes()}`.padStart(2, '0')
  const ss = `${date.getSeconds()}`.padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

function CctvDashboard({ onClose }) {
  const today = new Date()
  const [startDate, setStartDate] = useState(formatToday())
  const [endDate, setEndDate] = useState(formatToday())
  const [startTime, setStartTime] = useState(formatDateTimeLocal(today, '00', '00', '00'))
  const [endTime, setEndTime] = useState(formatDateTimeLocal(today, '23', '59', '59'))
  const [startIndex, setStartIndex] = useState(0)
  const [endIndex, setEndIndex] = useState(1000)
  const [mediaType, setMediaType] = useState('images')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [apiMessages, setApiMessages] = useState([])
  const [results, setResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  const isValidMediaType = useMemo(() => MEDIA_TYPES.includes(mediaType), [mediaType])

  const selectedResult = results[selectedIndex] || null

  const buildDateRange = (start, end) => {
    const startObj = new Date(`${start}T00:00:00`)
    const endObj = new Date(`${end}T00:00:00`)

    if (Number.isNaN(startObj.getTime()) || Number.isNaN(endObj.getTime())) {
      return null
    }

    if (startObj > endObj) {
      return []
    }

    const range = []
    const cursor = new Date(startObj)
    while (cursor <= endObj) {
      const y = cursor.getFullYear()
      const m = `${cursor.getMonth() + 1}`.padStart(2, '0')
      const d = `${cursor.getDate()}`.padStart(2, '0')
      range.push(`${y}-${m}-${d}`)
      cursor.setDate(cursor.getDate() + 1)
    }

    return range
  }

  const toTimestamp = (item) => {
    if (!item?.fileTime) return 0
    const t = new Date(item.fileTime.replace(' ', 'T')).getTime()
    return Number.isNaN(t) ? 0 : t
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!startDate || !endDate) {
      setErrorMessage('Start Date and End Date are required.')
      return
    }

    if (!startTime || !endTime) {
      setErrorMessage('StartTime and EndTime are required.')
      return
    }

    const formattedStartTime = toApiDateTime(startTime)
    const formattedEndTime = toApiDateTime(endTime)
    if (!formattedStartTime || !formattedEndTime) {
      setErrorMessage('StartTime/EndTime format is invalid. Expected yyyy-MM-dd HH:mm:ss.')
      return
    }

    const parsedStartIndex = parseInt(startIndex, 10)
    const parsedEndIndex = parseInt(endIndex, 10)
    if (Number.isNaN(parsedStartIndex) || Number.isNaN(parsedEndIndex)) {
      setErrorMessage('StartIndex and EndIndex are required.')
      return
    }

    if (parsedStartIndex < 0 || parsedEndIndex < 0 || parsedStartIndex > 1000 || parsedEndIndex > 1000) {
      setErrorMessage('StartIndex and EndIndex must be between 0 and 1000.')
      return
    }

    if (parsedStartIndex > parsedEndIndex) {
      setErrorMessage('StartIndex cannot be greater than EndIndex.')
      return
    }

    if (!isValidMediaType) {
      setErrorMessage('MediaType must be images or detected_images.')
      return
    }

    const dateRange = buildDateRange(startDate, endDate)
    if (dateRange === null) {
      setErrorMessage('Date format is invalid.')
      return
    }

    if (dateRange.length === 0) {
      setErrorMessage('Start Date must be earlier than or equal to End Date.')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setApiMessages([])

    try {
      const fetched = []
      const responseLogs = []

      for (const date of dateRange) {
        try {
          const response = await fetchLatestCctvImage({
            Date: date,
            MediaType: mediaType,
            StartTime: formattedStartTime,
            EndTime: formattedEndTime,
            StartIndex: parsedStartIndex,
            EndIndex: parsedEndIndex
          })

          responseLogs.push({
            date,
            success: response.success,
            errorMessage: response.errorMessage || null,
            fileTime: response.fileTime || null,
            hasImage: !!response.fileUrl
          })

          if (!response.success) {
            continue
          }

          if (response.fileUrl) {
            fetched.push({
              ...response,
              queryDate: date
            })
          }
        } catch (error) {
          responseLogs.push({
            date,
            success: false,
            errorMessage: error.message || 'Request failed',
            fileTime: null,
            hasImage: false
          })
        }
      }

      setApiMessages(responseLogs)

      if (fetched.length === 0) {
        setResults([])
        setSelectedIndex(0)
        setErrorMessage('No image result found in the selected date range.')
        return
      }

      fetched.sort((a, b) => toTimestamp(b) - toTimestamp(a))
      setResults(fetched)
      setSelectedIndex(0)
    } catch (error) {
      setResults([])
      setSelectedIndex(0)
      setApiMessages((prev) => ([
        ...prev,
        {
          date: '-',
          success: false,
          errorMessage: error.message || 'Failed to fetch latest CCTV image.',
          fileTime: null,
          hasImage: false
        }
      ]))
      setErrorMessage(error.message || 'Failed to fetch latest CCTV image.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-overlay">
      <div className="dashboard-modal">
        <button className="dashboard-close" onClick={onClose}>×</button>
        <div className="voice-dashboard cctv-dashboard">
          <div className="dashboard-container">
            <div className="search-panel">
              <h2>📷 CCTV Dashboard</h2>

              <form onSubmit={handleSubmit} className="search-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="cctv-start-date">Start Date</label>
                    <input
                      id="cctv-start-date"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cctv-end-date">End Date</label>
                    <input
                      id="cctv-end-date"
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="cctv-media-type">MediaType</label>
                    <select
                      id="cctv-media-type"
                      value={mediaType}
                      onChange={(event) => setMediaType(event.target.value)}
                    >
                      <option value="images">images</option>
                      <option value="detected_images">detected_images</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="cctv-start-time">StartTime</label>
                    <input
                      id="cctv-start-time"
                      type="datetime-local"
                      step="1"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cctv-end-time">EndTime</label>
                    <input
                      id="cctv-end-time"
                      type="datetime-local"
                      step="1"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="cctv-start-index">StartIndex</label>
                    <input
                      id="cctv-start-index"
                      type="number"
                      min="0"
                      max="1000"
                      value={startIndex}
                      onChange={(event) => setStartIndex(Math.max(0, Math.min(1000, parseInt(event.target.value, 10) || 0)))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cctv-end-index">EndIndex</label>
                    <input
                      id="cctv-end-index"
                      type="number"
                      min="0"
                      max="1000"
                      value={endIndex}
                      onChange={(event) => setEndIndex(Math.max(0, Math.min(1000, parseInt(event.target.value, 10) || 0)))}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="search-btn" disabled={loading}>
                  {loading ? 'Loading...' : 'Query Date Range'}
                </button>
              </form>

              {errorMessage && <div className="error-message">❌ {errorMessage}</div>}
            </div>

            {results.length > 0 && (
              <div className="stats-panel">
                <h3>📊 Query Summary</h3>
                <div className="stats-info">
                  <div className="stat-item"><span className="label">Date Range</span><span className="value">{startDate} ~ {endDate}</span></div>
                  <div className="stat-item"><span className="label">Time Range</span><span className="value">{toApiDateTime(startTime) || 'N/A'} ~ {toApiDateTime(endTime) || 'N/A'}</span></div>
                  <div className="stat-item"><span className="label">Index Range</span><span className="value">{startIndex} ~ {endIndex}</span></div>
                  <div className="stat-item"><span className="label">MediaType</span><span className="value">{mediaType}</span></div>
                  <div className="stat-item"><span className="label">Total Photos</span><span className="value">{results.length}</span></div>
                  <div className="stat-item"><span className="label">Selected Time</span><span className="value">{selectedResult?.fileTime || 'N/A'}</span></div>
                </div>
              </div>
            )}

            {apiMessages.length > 0 && (
              <div className="data-table-panel">
                <h3>📩 API Response Messages</h3>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Success</th>
                        <th>ErrorMessage</th>
                        <th>FileTime</th>
                        <th>Has Image</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiMessages.map((message, index) => (
                        <tr key={`${message.date}-${index}`}>
                          <td>{message.date}</td>
                          <td>{message.success ? 'True' : 'False'}</td>
                          <td>{message.errorMessage || '-'}</td>
                          <td>{message.fileTime || '-'}</td>
                          <td>{message.hasImage ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="data-table-panel">
              <h3>🕒 Photo Timeline</h3>
              {results.length > 0 ? (
                <div className="cctv-content-grid">
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Preview</th>
                          <th>File Time</th>
                          <th>Query Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((item, index) => (
                          <tr
                            key={`${item.queryDate}-${item.fileTime || index}-${item.fileUrl || ''}`}
                            className={index === selectedIndex ? 'expanded cctv-selected-row' : ''}
                            onClick={() => setSelectedIndex(index)}
                          >
                            <td>
                              <img
                                src={item.fileUrl}
                                alt={`CCTV ${item.fileTime || item.queryDate}`}
                                className="timeline-thumb"
                              />
                            </td>
                            <td>{item.fileTime || 'N/A'}</td>
                            <td>{item.queryDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="cctv-preview-panel">
                    {selectedResult?.fileUrl ? (
                      <>
                        <div className="cctv-image-frame">
                          <img src={selectedResult.fileUrl} alt="Latest CCTV" className="cctv-image" />
                        </div>
                        <div className="cctv-image-meta">
                          <div><strong>FileTime:</strong> {selectedResult.fileTime || 'N/A'}</div>
                          <div className="cctv-file-link-wrap">
                            <strong>FileUrl:</strong>
                            <a href={selectedResult.fileUrl} target="_blank" rel="noreferrer" className="cctv-file-link">
                              {selectedResult.fileUrl}
                            </a>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="cctv-placeholder">
                        Submit the query form to load the latest CCTV image.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="cctv-placeholder">
                  Submit the query form to load the latest CCTV image.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CctvDashboard
