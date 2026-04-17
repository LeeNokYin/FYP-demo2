import { useCallback, useState } from 'react'
import { fetchVoiceData } from '../services/voiceApi'

export function useVoiceMonitoring() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [voiceData, setVoiceData] = useState({
    voices: [],
    birdGroups: {} // { birdName: [voices...] }
  })

  const searchVoicesByDateRange = useCallback(async ({ startTime, endTime, startIndex = 0, endIndex = 1000 }) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetchVoiceData({
        StartTime: startTime,
        EndTime: endTime,
        StartIndex: startIndex,
        EndIndex: endIndex
      })

      if (!response.success) {
        setVoiceData({ voices: [], birdGroups: {} })
        setError(response.errorMessage || 'Search failed.')
        return { voices: [], birdGroups: {} }
      }

      const voices = response.voices || []
      
      // Group voices by bird name
      const birdGroups = {}
      voices.forEach((voice) => {
        const birdName = voice.birdName || 'Unknown'
        if (!birdGroups[birdName]) {
          birdGroups[birdName] = []
        }
        birdGroups[birdName].push(voice)
      })

      const result = { voices, birdGroups }
      setVoiceData(result)
      return result
    } catch (e) {
      setVoiceData({ voices: [], birdGroups: {} })
      setError(e.message || 'Search failed.')
      return { voices: [], birdGroups: {} }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    voiceData,
    searchVoicesByDateRange
  }
}

export default useVoiceMonitoring
