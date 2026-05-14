import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCctvMonitoring } from '../../../hooks/useCctvMonitoring'
import { downloadImage, batchDownloadImages } from '../../../services/imageDownloadService'
import './CctvMonitoring.css'

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

const parseFileDate = (fileTime) => {
  if (!fileTime || typeof fileTime !== 'string') return null
  const parsed = new Date(fileTime.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function CctvMonitoringTesting({ onClose }) {
  const [date, setDate] = useState(formatToday())
  const [startHour, setStartHour] = useState(8)
  const [endHour, setEndHour] = useState(20)
  const [interval, setInterval] = useState(10)
  const [selectedImage, setSelectedImage] = useState(null)
  const [appliedConfig, setAppliedConfig] = useState({
    date: formatToday(),
    startHour: 8,
    endHour: 20,
    interval: 10
  })
  const [downloadProgress, setDownloadProgress] = useState(null)
  const [downloadError, setDownloadError] = useState(null)
  const { loading, error, imageGroups, searchImages } = useCctvMonitoring()

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

  const filteredDetectedPhotos = useMemo(() => {
    const minHour = Math.min(appliedConfig.startHour, appliedConfig.endHour)
    const maxHour = Math.max(appliedConfig.startHour, appliedConfig.endHour)

    return imageGroups.detected_images.filter((item) => {
      const parsed = parseFileDate(item.fileTime)
      if (!parsed) return false
      const h = parsed.getHours()
      return h >= minHour && h <= maxHour
    })
  }, [appliedConfig.endHour, appliedConfig.startHour, imageGroups.detected_images])

  const detectedSlotMap = useMemo(() => {
    const map = new Map()

    filteredDetectedPhotos.forEach((item) => {
      const parsed = parseFileDate(item.fileTime)
      if (!parsed) return

      const hour = parsed.getHours()
      const minute = Math.floor(parsed.getMinutes() / appliedConfig.interval) * appliedConfig.interval
      const slotKey = toSlotKey(hour, minute)
      const existing = map.get(slotKey)

      if (!existing) {
        map.set(slotKey, item)
        return
      }

      const currentTs = parsed.getTime()
      const existingTs = parseFileDate(existing.fileTime)?.getTime() || 0
      if (currentTs > existingTs) {
        map.set(slotKey, item)
      }
    })

    return map
  }, [appliedConfig.interval, filteredDetectedPhotos])

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
    setAppliedConfig({ date, startHour, endHour, interval })
    await searchImages({ date, mediaType: 'detected_images' })
  }

  const handleDownload = () => {
    if (filteredDetectedPhotos.length === 0) return

    const content = JSON.stringify(
      {
        date: appliedConfig.date,
        startHour: Math.min(appliedConfig.startHour, appliedConfig.endHour),
        endHour: Math.max(appliedConfig.startHour, appliedConfig.endHour),
        interval: appliedConfig.interval,
        detectedImages: filteredDetectedPhotos
      },
      null,
      2
    )

    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cctv-detected-testing-${appliedConfig.date}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadSingleImage = async () => {
    if (!selectedImage?.url) {
      setDownloadError('No image selected')
      return
    }

    setDownloadError(null)
    try {
      const filename = selectedImage.fileTime
        ? `cctv-${selectedImage.fileTime.replace(/[\s:]/g, '-')}.jpg`
        : `cctv-image-${Date.now()}.jpg`
      await downloadImage(selectedImage.url, filename)
    } catch (err) {
      setDownloadError(`Download failed: ${err.message}`)
      console.error('Single image download error:', err)
    }
  }

  const handleBatchDownloadAll = async () => {
    if (filteredDetectedPhotos.length === 0) {
      setDownloadError('No images to download')
      return
    }

    setDownloadError(null)
    setDownloadProgress({ current: 0, total: filteredDetectedPhotos.length })

    try {
      await batchDownloadImages(filteredDetectedPhotos, (current, total) => {
        setDownloadProgress({ current, total })
      })
      setDownloadProgress(null)
    } catch (err) {
      setDownloadError(`Batch download failed: ${err.message}`)
      console.error('Batch download error:', err)
      setDownloadProgress(null)
    }
  }

  return (
    <>
      <aside className="cctv-monitoring-panel" aria-label="CCTV Monitoring (Detected Only) Panel">
        <div className="cctv-monitoring-header">
          <h3>CCTV Monitoring (Detected Only)</h3>
          <button type="button" className="cctv-monitoring-close" onClick={onClose} aria-label="Close CCTV monitoring detected-only panel">×</button>
        </div>

        <div className="cctv-monitoring-body">
          <div className="cctv-monitoring-controls">
            <div className="cctv-control-group">
              <label htmlFor="cctv-test-date">Date</label>
              <input id="cctv-test-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="cctv-control-group">
              <label htmlFor="cctv-test-start-hour">Starting Time: {startHour}</label>
              <input
                id="cctv-test-start-hour"
                type="range"
                min="0"
                max="24"
                step="1"
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
              />
            </div>

            <div className="cctv-control-group">
              <label htmlFor="cctv-test-end-hour">Ending Time: {endHour}</label>
              <input
                id="cctv-test-end-hour"
                type="range"
                min="0"
                max="24"
                step="1"
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
              />
            </div>

            <div className="cctv-control-group">
              <label htmlFor="cctv-test-interval">Interval: {interval} mins</label>
              <input
                id="cctv-test-interval"
                type="range"
                min="5"
                max="30"
                step="5"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
              />
            </div>

            <div className="cctv-stats-card">
              <div>Detected Images: {filteredDetectedPhotos.length}</div>
            </div>

            <div className="cctv-control-actions">
              <button type="button" className="cctv-btn" onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search detected only'}
              </button>
              <button
                type="button"
                className="cctv-btn secondary"
                onClick={handleDownload}
                disabled={filteredDetectedPhotos.length === 0}
              >
                Download JSON
              </button>
              <button
                type="button"
                className="cctv-btn secondary"
                onClick={handleBatchDownloadAll}
                disabled={filteredDetectedPhotos.length === 0 || downloadProgress !== null}
              >
                {downloadProgress ? `Downloading ${downloadProgress.current}/${downloadProgress.total}...` : 'Download All Images'}
              </button>
            </div>

            {error && <p className="cctv-error">{error}</p>}
            {downloadError && <p className="cctv-error">{downloadError}</p>}
            {downloadProgress && (
              <div style={{ padding: '8px', background: 'rgba(100, 200, 100, 0.2)', borderRadius: '4px', fontSize: '12px', color: '#a8d5a3' }}>
                Downloading: {downloadProgress.current}/{downloadProgress.total} images
              </div>
            )}
          </div>

          <div className="cctv-table-wrap">
            <h4 className="cctv-table-title">Detected Images (Success Only)</h4>
            <table className="cctv-time-table">
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
                    <td className="cctv-hour-label">{toHourLabel(hour)}</td>
                    {minuteRange.map((minute) => {
                      const item = detectedSlotMap.get(toSlotKey(hour, minute))
                      return (
                        <td key={`cell-${toSlotKey(hour, minute)}`}>
                          {item ? (
                            <img
                              className="cctv-slot-image"
                              src={item.url}
                              alt={item.fileTime || 'Detected Images'}
                              title={item.fileTime || ''}
                              onClick={() => setSelectedImage(item)}
                            />
                          ) : (
                            <div className="cctv-empty-cell" />
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
        <div className="cctv-image-overlay" onClick={() => setSelectedImage(null)}>
          <div className="cctv-image-overlay-content" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="cctv-image-overlay-close"
              aria-label="Close image preview"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
            <img
              className="cctv-image-overlay-img"
              src={selectedImage.url}
              alt={selectedImage.fileTime || 'cctv preview'}
            />
            <div style={{ padding: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
              <p className="cctv-image-overlay-time" style={{ margin: 0 }}>{selectedImage.fileTime || ''}</p>
              <button
                type="button"
                className="cctv-btn secondary"
                onClick={handleDownloadSingleImage}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                📥 Download Image
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default CctvMonitoringTesting
