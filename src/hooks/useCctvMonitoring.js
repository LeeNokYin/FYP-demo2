import { useCallback, useState } from 'react'
import { fetchCctvImageList } from '../services/voiceApi'

export function useCctvMonitoring() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageGroups, setImageGroups] = useState({
    images: [],
    detected_images: []
  })

  const searchImages = useCallback(async ({ date, mediaType = 'images' }) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetchCctvImageList({
        Date: date,
        MediaType: mediaType
      })

      if (!response.success) {
        setImageGroups((prev) => ({
          ...prev,
          [mediaType]: []
        }))
        setError(response.errorMessage || 'Search failed.')
        return []
      }

      const nextImages = response.imageFiles || []
      setImageGroups((prev) => ({
        ...prev,
        [mediaType]: nextImages
      }))
      return nextImages
    } catch (e) {
      setImageGroups((prev) => ({
        ...prev,
        [mediaType]: []
      }))
      setError(e.message || 'Search failed.')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const searchAllMedia = useCallback(async ({ date }) => {
    setLoading(true)
    setError('')

    try {
      const [imagesResponse, detectedResponse] = await Promise.all([
        fetchCctvImageList({ Date: date, MediaType: 'images' }),
        fetchCctvImageList({ Date: date, MediaType: 'detected_images' })
      ])

      const nextGroups = {
        images: imagesResponse.success ? imagesResponse.imageFiles || [] : [],
        detected_images: detectedResponse.success ? detectedResponse.imageFiles || [] : []
      }

      setImageGroups(nextGroups)

      if (!imagesResponse.success && !detectedResponse.success) {
        setError(imagesResponse.errorMessage || detectedResponse.errorMessage || 'Search failed.')
      }

      return nextGroups
    } catch (e) {
      setImageGroups({ images: [], detected_images: [] })
      setError(e.message || 'Search failed.')
      return { images: [], detected_images: [] }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    images: imageGroups.images,
    imageGroups,
    searchImages,
    searchAllMedia
  }
}

export default useCctvMonitoring
