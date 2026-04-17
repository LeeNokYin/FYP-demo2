import { useState } from 'react'
import * as Cesium from 'cesium'

export function useLocationSearch(viewerRef) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)

  const handleSearch = async (event) => {
    event.preventDefault()
    if (!searchQuery.trim()) return

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      )
      const data = await response.json()
      setSearchResults(data)
      setShowResults(true)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleSelectResult = (result) => {
    if (!viewerRef?.current) return

    const lon = parseFloat(result.lon)
    const lat = parseFloat(result.lat)

    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, 5000),
      duration: 2
    })

    setShowResults(false)
    setSearchQuery('')
  }

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    showResults,
    handleSearch,
    handleSelectResult
  }
}
