import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCctvMonitoring } from '../../../hooks/useCctvMonitoring'
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

function CctvMonitoring({ onClose }) {
  const [activeTableType, setActiveTableType] = useState('images')
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
  const { loading, error, imageGroups, searchAllMedia } = useCctvMonitoring()

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

  const createFilteredImages = (items) => {
    const minHour = Math.min(appliedConfig.startHour, appliedConfig.endHour)
    const maxHour = Math.max(appliedConfig.startHour, appliedConfig.endHour)

    return items.filter((item) => {
      const parsed = parseFileDate(item.fileTime)
      if (!parsed) return false
      const h = parsed.getHours()
      return h >= minHour && h <= maxHour
    })
  }

  const filteredImagePhotos = useMemo(
    () => createFilteredImages(imageGroups.images),
    [appliedConfig.endHour, appliedConfig.startHour, imageGroups.images]
  )

  const filteredDetectedPhotos = useMemo(
    () => createFilteredImages(imageGroups.detected_images),
    [appliedConfig.endHour, appliedConfig.startHour, imageGroups.detected_images]
  )

  const createSlotMap = (list) => {
    const map = new Map()

    list.forEach((item) => {
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
  }

  const imageSlotMap = useMemo(
    () => createSlotMap(filteredImagePhotos),
    [appliedConfig.interval, filteredImagePhotos]
  )

  const detectedSlotMap = useMemo(
    () => createSlotMap(filteredDetectedPhotos),
    [appliedConfig.interval, filteredDetectedPhotos]
  )

  const activeTitle = activeTableType === 'images' ? 'Images' : 'Detected Images'
  const activeSlotMap = activeTableType === 'images' ? imageSlotMap : detectedSlotMap

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
    const result = await searchAllMedia({ date })
    const totalPhotos = (result?.images?.length || 0) + (result?.detected_images?.length || 0)
    setHideTimeControls(totalPhotos > 0)
  }

  const handleDownload = () => {
    if (filteredImagePhotos.length === 0 && filteredDetectedPhotos.length === 0) return

    const content = JSON.stringify(
      {
        date: appliedConfig.date,
        startHour: Math.min(appliedConfig.startHour, appliedConfig.endHour),
        endHour: Math.max(appliedConfig.startHour, appliedConfig.endHour),
        interval: appliedConfig.interval,
        images: filteredImagePhotos,
        detectedImages: filteredDetectedPhotos
      },
      null,
      2
    )

    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cctv-monitoring-${appliedConfig.date}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <aside className="cctv-monitoring-panel" aria-label="CCTV Monitoring Panel">
        <div className="cctv-monitoring-header">
          <h3>CCTVMonitoring</h3>
          <button type="button" className="cctv-monitoring-close" onClick={onClose} aria-label="Close CCTV monitoring">×</button>
        </div>

        <div className="cctv-monitoring-body">
          <div className="cctv-monitoring-controls">
          <div className="cctv-control-group">
            <label htmlFor="cctv-date">Date</label>
            <input id="cctv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {!hideTimeControls && (
            <>
              <div className="cctv-control-group">
                <label htmlFor="cctv-start-hour">Starting Time: {startHour}</label>
                <input
                  id="cctv-start-hour"
                  type="range"
                  min="0"
                  max="23"
                  step="1"
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                />
              </div>

              <div className="cctv-control-group">
                <label htmlFor="cctv-end-hour">Ending Time: {endHour}</label>
                <input
                  id="cctv-end-hour"
                  type="range"
                  min="0"
                  max="23"
                  step="1"
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                />
              </div>

              <div className="cctv-control-group">
                <label htmlFor="cctv-interval">Interval: {interval} mins</label>
                <input
                  id="cctv-interval"
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

          {(filteredImagePhotos.length > 0 || filteredDetectedPhotos.length > 0) && (
            <div className="cctv-stats-card">
              <div>Images: {filteredImagePhotos.length}</div>
              <div>Detected Images: {filteredDetectedPhotos.length}</div>
              <div>Total Photos: {filteredImagePhotos.length + filteredDetectedPhotos.length}</div>
            </div>
          )}

          <div className="cctv-control-actions">
            <button type="button" className="cctv-btn" onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              type="button"
              className="cctv-btn secondary"
              onClick={handleDownload}
              disabled={filteredImagePhotos.length === 0 && filteredDetectedPhotos.length === 0}
            >
              Download
            </button>
            {(filteredImagePhotos.length > 0 || filteredDetectedPhotos.length > 0) && (
              <button
                type="button"
                className="cctv-btn secondary"
                onClick={() => setHideTimeControls((prev) => !prev)}
              >
                {hideTimeControls ? 'Show Time Controls' : 'Hide Time Controls'}
              </button>
            )}
          </div>

            {error && <p className="cctv-error">{error}</p>}
          </div>

          <div className="cctv-table-wrap">
            <div className="cctv-table-toggle-row">
              <button
                type="button"
                className={`cctv-table-toggle-btn ${activeTableType === 'images' ? 'active' : ''}`}
                onClick={() => setActiveTableType('images')}
              >
                Images
              </button>
              <button
                type="button"
                className={`cctv-table-toggle-btn ${activeTableType === 'detected_images' ? 'active' : ''}`}
                onClick={() => setActiveTableType('detected_images')}
              >
                Detected Images
              </button>
            </div>

            <h4 className="cctv-table-title">{activeTitle}</h4>
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
                      const item = activeSlotMap.get(toSlotKey(hour, minute))
                      return (
                        <td key={`cell-${toSlotKey(hour, minute)}`}>
                          {item ? (
                            <img
                              className="cctv-slot-image"
                              src={item.url}
                              alt={item.fileTime || activeTitle}
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
            <p className="cctv-image-overlay-time">{selectedImage.fileTime || ''}</p>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default CctvMonitoring
