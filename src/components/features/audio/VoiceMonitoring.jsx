import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useVoiceMonitoring } from '../../../hooks/useVoiceMonitoring'
import './VoiceMonitoring.css'

const formatToday = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = `${now.getMonth() + 1}`.padStart(2, '0')
  const d = `${now.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

const toHourLabel = (hour) => `${`${hour}`.padStart(2, '0')}:00`
const toMinuteLabel = (minute) => `${`${minute}`.padStart(2, '0')}`
const toSlotKey = (hour, minute) => `${hour}:${minute}`

const parseRecordTime = (recordTimeStr) => {
  if (!recordTimeStr || typeof recordTimeStr !== 'string') return null
  const parsed = new Date(recordTimeStr.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatDateToApiFormat = (dateStr) => {
  return `${dateStr} 00:00:00`
}

function VoiceMonitoring({ onClose }) {
  const [date, setDate] = useState(formatToday())
  const [startHour, setStartHour] = useState(8)
  const [endHour, setEndHour] = useState(20)
  const [interval, setInterval] = useState(10)
  const [hideTimeControls, setHideTimeControls] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [appliedConfig, setAppliedConfig] = useState({
    date: formatToday(),
    startHour: 8,
    endHour: 20,
    interval: 10
  })
  const { loading, error, voiceData, searchVoicesByDateRange } = useVoiceMonitoring()

  // Fetch voice data for the selected date
  useEffect(() => {
    const fetchVoicesForDate = async () => {
      const startTime = `${date} 00:00:00`
      const endTime = `${date} 23:59:59`

      await searchVoicesByDateRange({
        startTime,
        endTime,
        startIndex: 0,
        endIndex: 1000
      })
    }

    fetchVoicesForDate()
  }, [date])

  const hourRange = useMemo(() => {
    const from = Math.min(appliedConfig.startHour, appliedConfig.endHour)
    const to = Math.max(appliedConfig.startHour, appliedConfig.endHour)
    const list = []
    for (let h = from; h <= to; h += 1) list.push(h)
    return list
  }, [appliedConfig.endHour, appliedConfig.startHour])

  const minuteRange = useMemo(() => {
    const list = []
    for (let m = 0; m < 60; m += appliedConfig.interval) list.push(m)
    return list
  }, [appliedConfig.interval])

  const createFilteredVoices = (voices) => {
    const minHour = Math.min(appliedConfig.startHour, appliedConfig.endHour)
    const maxHour = Math.max(appliedConfig.startHour, appliedConfig.endHour)

    return voices.filter((voice) => {
      const parsed = parseRecordTime(voice.recordTime)
      if (!parsed) return false
      const h = parsed.getHours()
      return h >= minHour && h <= maxHour
    })
  }

  const filteredVoices = useMemo(() => {
    if (!voiceData.voices || voiceData.voices.length === 0) {
      return []
    }
    return createFilteredVoices(voiceData.voices)
  }, [voiceData.voices, appliedConfig.startHour, appliedConfig.endHour])

  const createSlotMap = (voices) => {
    const map = new Map()

    voices.forEach((voice) => {
      const parsed = parseRecordTime(voice.recordTime)
      if (!parsed) return

      const hour = parsed.getHours()
      const minute = Math.floor(parsed.getMinutes() / appliedConfig.interval) * appliedConfig.interval
      const slotKey = toSlotKey(hour, minute)
      const existing = map.get(slotKey)

      if (!existing) {
        map.set(slotKey, [voice])
      } else {
        existing.push(voice)
      }
    })

    return map
  }

  const voiceSlotMap = useMemo(
    () => createSlotMap(filteredVoices),
    [appliedConfig.interval, filteredVoices]
  )

  useEffect(() => {
    if (!selectedImage) return undefined

    const handleEsc = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation()
      }
      setSelectedImage(null)
    }

    window.addEventListener('keydown', handleEsc, true)
    return () => {
      window.removeEventListener('keydown', handleEsc, true)
    }
  }, [selectedImage])

  const handleSearch = async () => {
    setAppliedConfig({
      date,
      startHour,
      endHour,
      interval
    })

    setHideTimeControls(filteredVoices.length > 0)
  }

  const handleDownload = () => {
    if (filteredVoices.length === 0) return

    const content = JSON.stringify(
      {
        date: appliedConfig.date,
        startHour: Math.min(appliedConfig.startHour, appliedConfig.endHour),
        endHour: Math.max(appliedConfig.startHour, appliedConfig.endHour),
        interval: appliedConfig.interval,
        voices: filteredVoices
      },
      null,
      2
    )

    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `voice-monitoring-${appliedConfig.date}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <aside className="voice-monitoring-panel" aria-label="Voice Monitoring Panel">
        <div className="voice-monitoring-header">
          <h3>Voice Monitoring</h3>
          <button type="button" className="voice-monitoring-close" onClick={onClose} aria-label="Close voice monitoring">×</button>
        </div>

        <div className="voice-monitoring-body">
          <div className="voice-monitoring-controls">
            <div className="voice-control-group">
              <label htmlFor="voice-date">Date</label>
              <input id="voice-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            {!hideTimeControls && (
              <>
                <div className="voice-control-group">
                  <label htmlFor="voice-start-hour">Starting Time: {startHour}</label>
                  <input
                    id="voice-start-hour"
                    type="range"
                    min="0"
                    max="23"
                    step="1"
                    value={startHour}
                    onChange={(e) => setStartHour(Number(e.target.value))}
                  />
                </div>

                <div className="voice-control-group">
                  <label htmlFor="voice-end-hour">Ending Time: {endHour}</label>
                  <input
                    id="voice-end-hour"
                    type="range"
                    min="0"
                    max="23"
                    step="1"
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                  />
                </div>

                <div className="voice-control-group">
                  <label htmlFor="voice-interval">Interval: {interval} mins</label>
                  <input
                    id="voice-interval"
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                  />
                </div>
              </>
            )}

            {filteredVoices.length > 0 && (
              <div className="voice-stats-card">
                <div>Detections: {filteredVoices.length}</div>
                <div>BirdCount: {filteredVoices.reduce((sum, v) => sum + v.birdCount, 0)}</div>
              </div>
            )}

            <div className="voice-control-actions">
              <button type="button" className="voice-btn" onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button
                type="button"
                className="voice-btn secondary"
                onClick={handleDownload}
                disabled={filteredVoices.length === 0}
              >
                Download
              </button>
              {filteredVoices.length > 0 && (
                <button
                  type="button"
                  className="voice-btn secondary"
                  onClick={() => setHideTimeControls((prev) => !prev)}
                >
                  {hideTimeControls ? 'Show Time Controls' : 'Hide Time Controls'}
                </button>
              )}
            </div>

            {error && <p className="voice-error">{error}</p>}
          </div>

          <div className="voice-table-wrap">
            <h4 className="voice-table-title">All Birds - Detections Timeline</h4>
            {voiceData.voices && voiceData.voices.length === 0 && !loading && !error && (
              <p className="voice-table-empty">No detections found for this date.</p>
            )}
            <table className="voice-time-table">
              <thead>
                <tr>
                  <th>Time</th>
                  {minuteRange.map((minute) => (
                    <th key={`header-${minute}`}>{toMinuteLabel(minute)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hourRange.map((hour) => (
                  <tr key={`row-${hour}`}>
                    <td className="voice-hour-label">{toHourLabel(hour)}</td>
                    {minuteRange.map((minute) => {
                      const voice = voiceSlotMap.get(toSlotKey(hour, minute))
                      return (
                        <td key={`cell-${toSlotKey(hour, minute)}`}>
                          {voice && voice.length > 0 ? (
                            <div className="voice-slot-images">
                              {voice.map((v, idx) =>
                                v.iconUrl ? (
                                  <img
                                    key={`${toSlotKey(hour, minute)}-${idx}`}
                                    className="voice-slot-image"
                                    src={v.iconUrl}
                                    alt={`${v.birdName} - ${v.recordTime}`}
                                    title={`${v.birdName}\n${v.recordTime}\nCount: ${v.birdCount}, Score: ${v.birdScore}`}
                                    onClick={() => setSelectedImage(v)}
                                  />
                                ) : null
                              )}
                            </div>
                          ) : (
                            <div className="voice-empty-cell" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </aside>

      {selectedImage && typeof document !== 'undefined' && createPortal(
        <div className="voice-image-overlay" onClick={() => setSelectedImage(null)}>
          <div className="voice-image-overlay-content" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="voice-image-overlay-close"
              aria-label="Close image preview"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
            {selectedImage.iconUrl && (
              <img
                className="voice-image-overlay-img"
                src={selectedImage.iconUrl}
                alt={`${selectedImage.birdName} - ${selectedImage.recordTime}`}
              />
            )}
            <div className="voice-image-overlay-info">
              <div>{selectedImage.birdName}</div>
              <div>{selectedImage.recordTime}</div>
              <div>Count: {selectedImage.birdCount} | Score: {selectedImage.birdScore}</div>
              {selectedImage.soundUrl && (
                <audio controls style={{ marginTop: '8px' }}>
                  <source src={selectedImage.soundUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default VoiceMonitoring
