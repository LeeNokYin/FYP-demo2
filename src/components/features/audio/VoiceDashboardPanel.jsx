import { useEffect, useMemo, useState } from 'react'
import './VoiceDashboardPanel.css'

const DASHBOARD_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308', '#6366f1', '#ef4444']
const DIMMED_OPACITY = 0.1

const parseRecordTime = (recordTimeStr) => {
  if (!recordTimeStr || typeof recordTimeStr !== 'string') return null
  const parsed = new Date(recordTimeStr.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatDateToYmd = (date) => {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatDateTime = (date) => `${formatDateToYmd(date)} ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`

const formatHm = (date) => `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`

const formatHmFromMinutes = (totalMinutes) => {
  const rounded = Math.round(totalMinutes)
  if (rounded >= 24 * 60) {
    return '24:00'
  }
  const normalized = ((rounded % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`
}

const toCount = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const getItemOpacity = (activeBird, birdName) => (activeBird && activeBird !== birdName ? DIMMED_OPACITY : 1)

const getFallbackBirdColor = (birdName = '') => {
  const hash = [...birdName].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return DASHBOARD_COLORS[hash % DASHBOARD_COLORS.length]
}

const getBirdColor = (colorByBird, birdName) => colorByBird?.[birdName] || getFallbackBirdColor(birdName)

const toRadians = (deg) => (deg * Math.PI) / 180

const createPiePath = (cx, cy, radius, startDeg, endDeg) => {
  const start = {
    x: cx + radius * Math.cos(toRadians(startDeg - 90)),
    y: cy + radius * Math.sin(toRadians(startDeg - 90))
  }
  const end = {
    x: cx + radius * Math.cos(toRadians(endDeg - 90)),
    y: cy + radius * Math.sin(toRadians(endDeg - 90))
  }

  const largeArcFlag = endDeg - startDeg <= 180 ? '0' : '1'
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`
}

function HorizontalBarChart({ items, maxValue, watermark, activeBird, onBirdEnter, onBirdLeave, colorByBird }) {
  if (items.length === 0) {
    return <div className="voice-dashboard-empty">No ranking data for this date.</div>
  }

  return (
    <div className="voice-dashboard-hbar">
      <div className="voice-dashboard-watermark">{watermark}</div>
      {items.map((item, index) => {
        const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0
        return (
          <div
            key={item.name}
            className="voice-dashboard-hbar-row"
            style={{ opacity: getItemOpacity(activeBird, item.name) }}
            onMouseEnter={() => onBirdEnter(item.name)}
            onMouseLeave={onBirdLeave}
          >
            <div className="voice-dashboard-hbar-name">{item.name}</div>
            <div className="voice-dashboard-hbar-track">
              <div
                className="voice-dashboard-hbar-fill"
                style={{ width: `${width}%`, backgroundColor: getBirdColor(colorByBird, item.name) }}
              />
            </div>
            <div className="voice-dashboard-hbar-value">{item.value}</div>
          </div>
        )
      })}
    </div>
  )
}

function PieChart({ items, total, activeBird, onBirdEnter, onBirdLeave, colorByBird }) {
  if (items.length === 0 || total <= 0) {
    return <div className="voice-dashboard-empty">No composition data for this date.</div>
  }

  let progress = 0
  const segments = items.map((item, index) => {
    const pct = (item.value / total) * 100
    const start = progress
    progress += pct
    return {
      ...item,
      color: getBirdColor(colorByBird, item.name),
      start,
      end: progress,
      pct,
      startDeg: start * 3.6,
      endDeg: progress * 3.6
    }
  })

  return (
    <div className="voice-dashboard-pie-wrap">
      <svg viewBox="0 0 220 220" className="voice-dashboard-pie" role="img" aria-label="Top 10 birds ratio pie chart">
        {segments.map((segment) => (
          <path
            key={segment.name}
            d={createPiePath(110, 110, 86, segment.startDeg, segment.endDeg)}
            fill={segment.color}
            style={{ opacity: getItemOpacity(activeBird, segment.name) }}
            onMouseEnter={() => onBirdEnter(segment.name)}
            onMouseLeave={onBirdLeave}
          />
        ))}
        <circle cx="110" cy="110" r="52" fill="#ffffff" />
      </svg>
      <div className="voice-dashboard-pie-labels">
        {segments.map((segment) => (
          <div
            key={segment.name}
            className="voice-dashboard-pie-label"
            style={{ opacity: getItemOpacity(activeBird, segment.name) }}
            onMouseEnter={() => onBirdEnter(segment.name)}
            onMouseLeave={onBirdLeave}
          >
            <span className="voice-dashboard-dot" style={{ backgroundColor: segment.color }} />
            <span>{segment.name}: {segment.pct.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LineChart({ timeline, series, maxY, activeBird, onBirdEnter, onBirdLeave, activeIndex, colorByBird }) {
  if (timeline.length === 0 || series.length === 0) {
    return <div className="voice-dashboard-empty">No timeline data for this date.</div>
  }

  const width = 640
  const height = 260
  const paddingLeft = 38
  const paddingRight = 72
  const paddingTop = 18
  const paddingBottom = 34
  const plotWidth = width - paddingLeft - paddingRight
  const plotHeight = height - paddingTop - paddingBottom

  const xForIndex = (index) => paddingLeft + (timeline.length <= 1 ? 0 : (index / (timeline.length - 1)) * plotWidth)
  const yForValue = (value) => paddingTop + (1 - value / Math.max(1, maxY)) * plotHeight

  return (
    <div className="voice-dashboard-line">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="voice-dashboard-svg">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingTop + ratio * plotHeight
          const value = Math.round((1 - ratio) * maxY)
          return (
            <g key={ratio}>
              <line x1={paddingLeft} x2={paddingLeft + plotWidth} y1={y} y2={y} className="voice-dashboard-grid-line" />
              <text x={8} y={y + 4} className="voice-dashboard-axis-label">{value}</text>
            </g>
          )
        })}

        {timeline.map((tick, idx) => (
          <text key={tick} x={xForIndex(idx)} y={height - 10} textAnchor="middle" className="voice-dashboard-axis-label">{tick}</text>
        ))}

        {series.map((line) => {
          const color = getBirdColor(colorByBird, line.name)
          const clippedValues = line.values.map((value, idx) => (idx <= activeIndex ? value : null))
          const points = clippedValues
            .map((value, idx) => (value == null ? null : `${xForIndex(idx)},${yForValue(value)}`))
            .filter(Boolean)
            .join(' ')

          const safeActiveIndex = Math.max(0, Math.min(activeIndex, line.values.length - 1))
          const lastIndex = safeActiveIndex
          const lastX = xForIndex(lastIndex)
          const lastY = yForValue(line.values[lastIndex])

          return (
            <g
              key={line.name}
              style={{ opacity: getItemOpacity(activeBird, line.name) }}
              onMouseEnter={() => onBirdEnter(line.name)}
              onMouseLeave={onBirdLeave}
            >
              <polyline points={points} fill="none" stroke={color} strokeWidth="2.2" />
              {line.values.map((value, idx) => (
                <circle
                  key={`${line.name}-${timeline[idx]}`}
                  cx={xForIndex(idx)}
                  cy={yForValue(value)}
                  r="3.3"
                  fill="#ffffff"
                  stroke={color}
                  strokeWidth="1.8"
                  style={{ opacity: idx <= activeIndex ? 1 : DIMMED_OPACITY }}
                />
              ))}
              <text x={lastX + 8} y={lastY + 4} className="voice-dashboard-line-label" fill={color}>{line.name}: {line.values[lastIndex]}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function StackedBarChart({ timeline, stackedData, maxTotal, activeBird, onBirdEnter, onBirdLeave, activeIndex, colorByBird }) {
  if (timeline.length === 0 || stackedData.length === 0) {
    return <div className="voice-dashboard-empty">No stack data for this date.</div>
  }

  return (
    <div className="voice-dashboard-stacked-wrap">
      <div className="voice-dashboard-stacked-bars">
        {stackedData.map((slot, slotIndex) => (
          <div
            key={slot.time}
            className={`voice-dashboard-stacked-col ${slotIndex === activeIndex ? 'active' : ''}`}
          >
            <div className="voice-dashboard-stacked-total">{slot.total}</div>
            <div className="voice-dashboard-stacked-bar">
              {slot.parts
                .filter((part) => part.value > 0)
                .map((part) => {
                  const heightPct = maxTotal > 0 ? (part.value / maxTotal) * 100 : 0
                  return (
                    <div
                      key={`${slot.time}-${part.name}`}
                      className="voice-dashboard-stacked-segment"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: getBirdColor(colorByBird, part.name),
                        opacity: getItemOpacity(activeBird, part.name)
                      }}
                      onMouseEnter={() => onBirdEnter(part.name)}
                      onMouseLeave={onBirdLeave}
                    >
                      {part.value >= 2 && <span>{part.value}</span>}
                    </div>
                  )
                })}
            </div>
            <div className="voice-dashboard-stacked-time">{slot.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function VoiceDashboardPanel({ voices, selectedDate, queryStartHour = 8, queryEndHour = 20 }) {
  const [timelineIndex, setTimelineIndex] = useState(0)
  const [activeBird, setActiveBird] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const dashboardData = useMemo(() => {
    const records = (voices || [])
      .map((voice) => {
        const parsed = parseRecordTime(voice.recordTime)
        if (!parsed) return null

        return {
          birdName: voice.birdName || 'Unknown',
          count: toCount(voice.birdCount),
          date: formatDateToYmd(parsed),
          dateTime: parsed,
          time: formatHm(parsed)
        }
      })
      .filter(Boolean)

    const preferredDate = selectedDate || (records[0] ? records[0].date : null)

    const byDate = records.reduce((acc, record) => {
      const list = acc.get(record.date) || []
      list.push(record)
      acc.set(record.date, list)
      return acc
    }, new Map())

    const fallbackDate = records[0] ? records[0].date : null
    const selected = preferredDate && byDate.has(preferredDate) ? preferredDate : fallbackDate
    const selectedRecords = selected ? byDate.get(selected) || [] : records

    const sumCount = (list) => list.reduce((sum, item) => sum + item.count, 0)

    const buildBirdTotals = (list) => {
      const map = new Map()
      list.forEach((record) => {
        map.set(record.birdName, (map.get(record.birdName) || 0) + record.count)
      })
      return [...map.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    }

    const topBirds = buildBirdTotals(selectedRecords).slice(0, 10)

    const totalOccurrences = sumCount(selectedRecords)

    const top1 = topBirds[0] || { name: '-', value: 0 }

    const earliestRecordTime = selectedRecords.reduce((best, record) => {
      if (!best) return record.dateTime
      return record.dateTime < best ? record.dateTime : best
    }, null)

    const latestRecordTime = selectedRecords.reduce((best, record) => {
      if (!best) return record.dateTime
      return record.dateTime > best ? record.dateTime : best
    }, null)

    const fallbackStartMinutes = Math.min(queryStartHour, queryEndHour) * 60
    const fallbackEndMinutes = Math.max(queryStartHour, queryEndHour) * 60
    const startMinutes = earliestRecordTime
      ? (Math.floor((earliestRecordTime.getHours() * 60 + earliestRecordTime.getMinutes()) / 60) * 60)
      : fallbackStartMinutes
    const endMinutes = latestRecordTime
      ? (Math.ceil((latestRecordTime.getHours() * 60 + latestRecordTime.getMinutes()) / 60) * 60)
      : fallbackEndMinutes
    const timelineStepMinutes = 60
    const timelineSpan = Math.max(timelineStepMinutes, endMinutes - startMinutes)
    const segments = Math.max(1, Math.ceil(timelineSpan / timelineStepMinutes))

    const timelineMinutes = Array.from({ length: segments + 1 }, (_, idx) => startMinutes + (idx * timelineStepMinutes))
    const timeline = timelineMinutes.map((minutes) => formatHmFromMinutes(minutes))

    const birdsForSeries = topBirds.map((item) => item.name)

    const bucketByBird = new Map()
    birdsForSeries.forEach((birdName) => {
      bucketByBird.set(birdName, Array(segments + 1).fill(0))
    })

    selectedRecords.forEach((record) => {
      const minuteOfDay = record.dateTime.getHours() * 60 + record.dateTime.getMinutes() + record.dateTime.getSeconds() / 60
      const idx = clamp(Math.floor((minuteOfDay - startMinutes) / timelineStepMinutes), 0, segments)
      const buckets = bucketByBird.get(record.birdName)
      if (!buckets) return
      buckets[idx] += record.count
    })

    const series = birdsForSeries.map((birdName) => {
      const values = bucketByBird.get(birdName) || Array(segments + 1).fill(0)

      return { name: birdName, values }
    })

    const colorByBird = birdsForSeries.reduce((acc, birdName, index) => {
      acc[birdName] = DASHBOARD_COLORS[index % DASHBOARD_COLORS.length]
      return acc
    }, {})

    const stackedData = timeline.map((time, timeIdx) => {
      const parts = birdsForSeries.map((birdName) => {
        const value = bucketByBird.get(birdName)?.[timeIdx] || 0

        return { name: birdName, value }
      })

      const total = parts.reduce((sum, item) => sum + item.value, 0)
      return { time, parts, total }
    })

    const maxBarValue = topBirds.length > 0 ? topBirds[0].value : 1
    const maxLineChartY = Math.max(1, ...series.flatMap((line) => line.values))
    const maxStackedChartY = Math.max(1, ...stackedData.map((slot) => slot.total))

    const latestDateTime = selectedRecords.length > 0
      ? formatDateTime(selectedRecords
        .map((record) => record.dateTime)
        .sort((a, b) => b - a)[0])
      : null

    const legendBirds = topBirds.map((item) => item.name)

    return {
      topBirds,
      totalOccurrences,
      top1,
      timeline,
      series,
      stackedData,
      maxBarValue,
      maxLineChartY,
      maxStackedChartY,
      latestDateTime,
      legendBirds,
      colorByBird,
      effectiveDate: selected
    }
  }, [queryEndHour, queryStartHour, selectedDate, voices])

  useEffect(() => {
    setTimelineIndex(Math.max(0, dashboardData.timeline.length - 1))
    setIsPlaying(false)
  }, [dashboardData.timeline])

  useEffect(() => {
    if (!isPlaying) return undefined
    if (dashboardData.timeline.length <= 1) return undefined

    const timer = window.setInterval(() => {
      setTimelineIndex((prev) => {
        const lastIndex = Math.max(0, dashboardData.timeline.length - 1)
        if (prev >= lastIndex) {
          setIsPlaying(false)
          return lastIndex
        }
        return prev + 1
      })
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [dashboardData.timeline.length, isPlaying])

  const handleBirdEnter = (birdName) => setActiveBird(birdName)
  const handleBirdLeave = () => setActiveBird(null)

  const cumulativeTopBirds = dashboardData.series
    .map((line) => ({
      name: line.name,
      value: line.values
        .slice(0, Math.max(0, timelineIndex) + 1)
        .reduce((sum, value) => sum + value, 0)
    }))
    .sort((a, b) => b.value - a.value)
  const displayTopBirds = cumulativeTopBirds
  const displayTotal = displayTopBirds.reduce((sum, item) => sum + item.value, 0)

  const timelineTime = dashboardData.timeline[timelineIndex] || 'N/A'

  return (
    <section className="voice-dashboard-root" aria-label="Voice monitoring dashboard">
      <div className="voice-dashboard-grid">
        <div className="voice-dashboard-kpi-row">
          <article className="voice-dashboard-kpi-card">
            <h4>Total Cumulative Bird Occurrences</h4>
            <div className="voice-dashboard-kpi-main">{dashboardData.totalOccurrences} <span>(Times)</span></div>
            <div className="voice-dashboard-kpi-sub">
              Date: {dashboardData.effectiveDate || selectedDate || 'N/A'}
            </div>
          </article>

          <article className="voice-dashboard-kpi-card">
            <h4>Top 1 Bird</h4>
            <div className="voice-dashboard-kpi-badge">{dashboardData.top1.name}</div>
            <div className="voice-dashboard-kpi-main">{dashboardData.top1.value} <span>(Times)</span></div>
            <div className="voice-dashboard-kpi-sub">Within selected time range</div>
          </article>

        </div>

        <section className="voice-dashboard-block">
          <div className="voice-dashboard-block-header">
            <h4>The cumulative total occurrences for birds (top 10 birds)</h4>
            <p>- Sensor at Morrision Hill (聲紋監測儀)</p>
          </div>
          <div className="voice-dashboard-chart-grid">
            <HorizontalBarChart
              items={displayTopBirds}
              maxValue={Math.max(1, ...displayTopBirds.map((item) => item.value))}
              watermark={dashboardData.latestDateTime || 'N/A'}
              activeBird={activeBird}
              onBirdEnter={handleBirdEnter}
              onBirdLeave={handleBirdLeave}
              colorByBird={dashboardData.colorByBird}
            />
            <PieChart
              items={displayTopBirds}
              total={displayTotal}
              activeBird={activeBird}
              onBirdEnter={handleBirdEnter}
              onBirdLeave={handleBirdLeave}
              colorByBird={dashboardData.colorByBird}
            />
          </div>
        </section>

        <section className="voice-dashboard-block">
          <div className="voice-dashboard-block-header">
            <h4>The number of bird occurrences at that time (top 10 birds)</h4>
          </div>
          <div className="voice-dashboard-chart-grid">
            <LineChart
              timeline={dashboardData.timeline}
              series={dashboardData.series}
              maxY={dashboardData.maxLineChartY}
              activeBird={activeBird}
              onBirdEnter={handleBirdEnter}
              onBirdLeave={handleBirdLeave}
              activeIndex={timelineIndex}
              colorByBird={dashboardData.colorByBird}
            />
            <StackedBarChart
              timeline={dashboardData.timeline}
              stackedData={dashboardData.stackedData}
              maxTotal={dashboardData.maxStackedChartY}
              activeBird={activeBird}
              onBirdEnter={handleBirdEnter}
              onBirdLeave={handleBirdLeave}
              activeIndex={timelineIndex}
              colorByBird={dashboardData.colorByBird}
            />
          </div>
        </section>

        <section className="voice-dashboard-bottom">
          <div className="voice-dashboard-legend" role="list" aria-label="Bird legend">
            {dashboardData.legendBirds.map((birdName, idx) => (
              <div
                className="voice-dashboard-legend-item"
                role="listitem"
                key={birdName}
                style={{ opacity: getItemOpacity(activeBird, birdName) }}
                onMouseEnter={() => handleBirdEnter(birdName)}
                onMouseLeave={handleBirdLeave}
              >
                <span className="voice-dashboard-dot" style={{ backgroundColor: getBirdColor(dashboardData.colorByBird, birdName) }} />
                <span>{birdName}</span>
              </div>
            ))}
          </div>

          <div className="voice-dashboard-timeline-wrap">
            <button type="button" className="voice-dashboard-arrow" onClick={() => setTimelineIndex((prev) => clamp(prev - 1, 0, Math.max(0, dashboardData.timeline.length - 1)))} aria-label="Move timeline left">◀</button>
            <div className="voice-dashboard-slider-box">
              <div className="voice-dashboard-current-time">{selectedDate || 'N/A'} {timelineTime}</div>
              <button
                type="button"
                className="voice-dashboard-play-btn"
                onClick={() => {
                  if (timelineIndex >= Math.max(0, dashboardData.timeline.length - 1)) {
                    setTimelineIndex(0)
                  }
                  setIsPlaying((prev) => !prev)
                }}
                disabled={dashboardData.timeline.length <= 1}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <input
                className="voice-dashboard-slider"
                type="range"
                min="0"
                max={Math.max(0, dashboardData.timeline.length - 1)}
                value={timelineIndex}
                onChange={(event) => {
                  setIsPlaying(false)
                  setTimelineIndex(Number(event.target.value))
                }}
                disabled={dashboardData.timeline.length <= 1}
              />
              <div className="voice-dashboard-slider-ticks">
                {dashboardData.timeline.map((time) => (
                  <span key={time}>{time}</span>
                ))}
              </div>
            </div>
            <button type="button" className="voice-dashboard-arrow" onClick={() => setTimelineIndex((prev) => clamp(prev + 1, 0, Math.max(0, dashboardData.timeline.length - 1)))} aria-label="Move timeline right">▶</button>
          </div>
        </section>
      </div>
    </section>
  )
}

export default VoiceDashboardPanel
