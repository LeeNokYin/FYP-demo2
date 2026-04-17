import { useMemo } from 'react'

export function buildBirdStats(voices) {
  const stats = {}

  voices.forEach((voice) => {
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

  Object.keys(stats).forEach((bird) => {
    const count = stats[bird].count
    stats[bird].avgScore = count > 0 ? (stats[bird].totalScore / count).toFixed(1) : '0.0'
  })

  return stats
}

export function buildTimeDistribution(voices) {
  return Object.entries(
    voices.reduce((hourMap, voice) => {
      const hour = voice.recordTime?.split(' ')[1]?.split(':')[0] || '00'
      hourMap[hour] = (hourMap[hour] || 0) + 1
      return hourMap
    }, {})
  )
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour))
}

export function useVoiceAnalytics(voicesInput) {
  const voices = Array.isArray(voicesInput) ? voicesInput : []

  return useMemo(() => {
    const birdStats = buildBirdStats(voices)
    const top5Birds = Object.entries(birdStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, stats]) => ({ name, ...stats }))
    const timeDistribution = buildTimeDistribution(voices)
    const totalBirds = Object.keys(birdStats).length
    const totalOccurrences = voices.length
    const totalCount = Object.values(birdStats).reduce((sum, bird) => sum + bird.count, 0)

    return {
      birdStats,
      top5Birds,
      timeDistribution,
      totalBirds,
      totalOccurrences,
      totalCount
    }
  }, [voices])
}
