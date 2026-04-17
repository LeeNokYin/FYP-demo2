import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import birdData from '../../../data/birddata.json'
import birdIcon from '../../../image/pigeon_icon.jpeg'
import './BirdListPanel.css'

const toDatetimeLocalValue = (timestampMs) => {
  const date = new Date(timestampMs)
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  const hh = `${date.getHours()}`.padStart(2, '0')
  const mm = `${date.getMinutes()}`.padStart(2, '0')
  return `${y}-${m}-${d}T${hh}:${mm}`
}

const formatPlaybackTime = (timestampMs) => {
  if (!Number.isFinite(timestampMs)) return '-'
  return new Date(timestampMs).toLocaleString()
}

function BirdListPanel({ onClose, viewer }) {
  const markerRefs = useRef([])
  const circularIconRef = useRef('')
  const playbackTimerRef = useRef(null)
  const playbackRunIdRef = useRef(0)
  const timestamps = useMemo(
    () => birdData
      .map((item) => Date.parse(item.date))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b),
    []
  )
  const defaultStart = timestamps.length > 0 ? toDatetimeLocalValue(timestamps[0]) : ''
  const defaultEnd = timestamps.length > 0 ? toDatetimeLocalValue(timestamps[timestamps.length - 1]) : ''
  const [startTime, setStartTime] = useState(defaultStart)
  const [endTime, setEndTime] = useState(defaultEnd)
  const [placedCount, setPlacedCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackTimeline, setPlaybackTimeline] = useState([])
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState('-')

  const stopPlayback = useCallback(() => {
    playbackRunIdRef.current += 1
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current)
      playbackTimerRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const getTimeRange = useCallback(() => {
    const startMs = Date.parse(startTime)
    const endMs = Date.parse(endTime)

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return { error: 'Please select valid start and end times.' }
    }

    if (startMs > endMs) {
      return { error: 'Start time must be earlier than end time.' }
    }

    return { startMs, endMs }
  }, [startTime, endTime])

  const buildTimeline = useCallback((startMs, endMs) => {
    const rowsInRange = birdData
      .map((item, index) => ({ item, index, ts: Date.parse(item.date) }))
      .filter((entry) => Number.isFinite(entry.ts) && entry.ts >= startMs && entry.ts <= endMs)
      .sort((a, b) => a.ts - b.ts)

    const groupedByTimestamp = rowsInRange.reduce((map, entry) => {
      const key = `${entry.ts}`
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key).push(entry)
      return map
    }, new Map())

    return Array.from(groupedByTimestamp.entries()).sort((a, b) => Number(a[0]) - Number(b[0]))
  }, [])

  const createMarkerEntity = useCallback((item, index, markerIcon) => {
    if (!viewer) return null

    const lon = Number(item.longitude)
    const lat = Number(item.latitude)
    const height = Number(item.H)
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return null
    }

    return viewer.entities.add({
      id: `bird-marker-${index}-${item.date}`,
      position: Cesium.Cartesian3.fromDegrees(lon, lat, Number.isFinite(height) ? height : 0),
      billboard: {
        image: markerIcon,
        scale: 0.1,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      },
      properties: {
        cls: item.cls,
        date: item.date
      }
    })
  }, [viewer])

  const clearMarkers = useCallback(() => {
    if (!viewer) {
      markerRefs.current = []
      return
    }

    markerRefs.current.forEach((entity) => {
      viewer.entities.remove(entity)
    })
    markerRefs.current = []
    setPlacedCount(0)
  }, [viewer])

  const renderTimelineUpToStep = useCallback((timeline, stepIndex, markerIcon) => {
    if (!viewer) return
    clearMarkers()

    if (!Array.isArray(timeline) || timeline.length === 0 || stepIndex < 0) {
      setCurrentStepIndex(-1)
      setCurrentPlaybackTime('-')
      return
    }

    const boundedStep = Math.min(stepIndex, timeline.length - 1)
    const nextMarkers = []

    for (let i = 0; i <= boundedStep; i += 1) {
      const [, entries] = timeline[i]
      entries.forEach((entry) => {
        const marker = createMarkerEntity(entry.item, entry.index, markerIcon)
        if (marker) {
          nextMarkers.push(marker)
        }
      })
    }

    markerRefs.current = nextMarkers
    setPlacedCount(nextMarkers.length)
    setCurrentStepIndex(boundedStep)
    setCurrentPlaybackTime(formatPlaybackTime(Number(timeline[boundedStep][0])))
  }, [clearMarkers, createMarkerEntity, viewer])

  useEffect(() => () => {
    stopPlayback()
    clearMarkers()
  }, [clearMarkers, stopPlayback])

  const getCircularBirdIcon = useCallback(async () => {
    if (circularIconRef.current) {
      return circularIconRef.current
    }

    const image = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = birdIcon
    })

    const size = Math.min(image.width, image.height)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      circularIconRef.current = birdIcon
      return birdIcon
    }

    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    const sourceX = (image.width - size) / 2
    const sourceY = (image.height - size) / 2
    ctx.drawImage(image, sourceX, sourceY, size, size, 0, 0, size, size)

    circularIconRef.current = canvas.toDataURL('image/png')
    return circularIconRef.current
  }, [])

  const handleApply = async () => {
    if (!viewer) {
      setErrorMessage('Map viewer is not ready.')
      return
    }

    const range = getTimeRange()
    if (range.error) {
      setErrorMessage(range.error)
      return
    }
    const { startMs, endMs } = range

    stopPlayback()
    clearMarkers()
    setCurrentStepIndex(-1)
    setCurrentPlaybackTime('-')

    let markerIcon = birdIcon
    try {
      markerIcon = await getCircularBirdIcon()
    } catch {
      markerIcon = birdIcon
    }

    const filteredRows = birdData.filter((item) => {
      const itemTime = Date.parse(item.date)
      return Number.isFinite(itemTime) && itemTime >= startMs && itemTime <= endMs
    })

    const timeline = buildTimeline(startMs, endMs)
    setPlaybackTimeline(timeline)

    const nextMarkers = filteredRows
      .map((item, index) => createMarkerEntity(item, index, markerIcon))
      .filter(Boolean)

    markerRefs.current = nextMarkers
    setPlacedCount(nextMarkers.length)
    setErrorMessage('')
  }

  const handlePlay = async () => {
    if (!viewer) {
      setErrorMessage('Map viewer is not ready.')
      return
    }

    const range = getTimeRange()
    if (range.error) {
      setErrorMessage(range.error)
      return
    }
    const { startMs, endMs } = range

    stopPlayback()
    clearMarkers()
    setCurrentStepIndex(-1)
    setCurrentPlaybackTime('-')

    let markerIcon = birdIcon
    try {
      markerIcon = await getCircularBirdIcon()
    } catch {
      markerIcon = birdIcon
    }

    const timeline = buildTimeline(startMs, endMs)
    setPlaybackTimeline(timeline)

    if (timeline.length === 0) {
      setPlacedCount(0)
      setErrorMessage('No bird data found in the selected time range.')
      return
    }

    const runId = playbackRunIdRef.current + 1
    playbackRunIdRef.current = runId
    setIsPlaying(true)
    setErrorMessage('')

    let markerCount = 0
    const playStep = (stepIndex) => {
      if (playbackRunIdRef.current !== runId) {
        return
      }

      if (stepIndex >= timeline.length) {
        setIsPlaying(false)
        return
      }

      const [, entries] = timeline[stepIndex]
      setCurrentStepIndex(stepIndex)
      setCurrentPlaybackTime(formatPlaybackTime(Number(timeline[stepIndex][0])))
      const addedMarkers = entries
        .map((entry) => createMarkerEntity(entry.item, entry.index, markerIcon))
        .filter(Boolean)

      markerRefs.current.push(...addedMarkers)
      markerCount += addedMarkers.length
      setPlacedCount(markerCount)

      const hasNext = stepIndex + 1 < timeline.length
      if (!hasNext) {
        setIsPlaying(false)
        return
      }

      const currentTs = Number(timeline[stepIndex][0])
      const nextTs = Number(timeline[stepIndex + 1][0])
      const deltaMs = nextTs - currentTs
      const waitMs = Math.min(1200, Math.max(250, Math.round(deltaMs / 20)))
      playbackTimerRef.current = window.setTimeout(() => playStep(stepIndex + 1), waitMs)
    }

    playStep(0)
  }

  const handleSeek = async (event) => {
    const requestedStep = Number(event.target.value)
    if (!Number.isFinite(requestedStep) || playbackTimeline.length === 0) {
      return
    }

    stopPlayback()

    let markerIcon = birdIcon
    try {
      markerIcon = await getCircularBirdIcon()
    } catch {
      markerIcon = birdIcon
    }

    renderTimelineUpToStep(playbackTimeline, requestedStep, markerIcon)
    setErrorMessage('')
  }

  const handleClose = () => {
    stopPlayback()
    clearMarkers()
    if (typeof onClose === 'function') {
      onClose()
    }
  }

  return (
    <aside className="bird-list-panel" role="dialog" aria-modal="false" aria-label="Bird list panel">
      <div className="bird-list-header">
        <h3>List of bird</h3>
        <button type="button" className="bird-list-close" onClick={handleClose} aria-label="Close bird list panel">×</button>
      </div>

      <div className="bird-list-body">
        <div className="bird-list-controls">
          <label htmlFor="bird-start-time">Start time</label>
          <input
            id="bird-start-time"
            type="datetime-local"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />

          <label htmlFor="bird-end-time">End time</label>
          <input
            id="bird-end-time"
            type="datetime-local"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />

          <button type="button" className="bird-list-apply" onClick={handleApply}>Apply</button>
          <button type="button" className="bird-list-apply" onClick={handlePlay} disabled={isPlaying}>Play</button>
          <button type="button" className="bird-list-apply" onClick={stopPlayback} disabled={!isPlaying}>Stop</button>

          <p className="bird-list-result">Current playback time: {currentPlaybackTime}</p>

          {playbackTimeline.length > 0 && (
            <>
              <label htmlFor="bird-playback-seek">Playback time slider</label>
              <input
                id="bird-playback-seek"
                type="range"
                min="0"
                max={`${Math.max(0, playbackTimeline.length - 1)}`}
                step="1"
                value={Math.max(0, currentStepIndex)}
                onChange={handleSeek}
              />
            </>
          )}

          {errorMessage && <p className="bird-list-error">{errorMessage}</p>}
          {!errorMessage && <p className="bird-list-result">Placed bird icons: {placedCount}</p>}
        </div>
      </div>
    </aside>
  )
}

export default BirdListPanel
