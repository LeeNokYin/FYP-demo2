import { useCallback, useEffect, useRef, useState } from 'react'

export function useAudioPlayer() {
  const [playingId, setPlayingId] = useState(null)
  const audioRef = useRef(null)

  const stop = useCallback(() => {
    const activeAudio = audioRef.current
    if (activeAudio) {
      activeAudio.pause()
      activeAudio.onended = null
      audioRef.current = null
    }
    setPlayingId(null)
  }, [])

  const playById = useCallback(
    (id, url) => {
      if (!url) return

      stop()

      const audio = new Audio(url)
      audioRef.current = audio
      setPlayingId(id)

      audio.play().catch((error) => {
        console.error('Play failed:', error)
        if (audioRef.current === audio) {
          audioRef.current = null
        }
        setPlayingId(null)
      })

      audio.onended = () => {
        if (audioRef.current === audio) {
          audioRef.current = null
        }
        setPlayingId(null)
      }
    },
    [stop]
  )

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    playingId,
    playById,
    stop
  }
}
