import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import CesiumCompass from './CesiumCompass'
import './MapView.css'
import Toolbar from './Toolbar'; 


function MapView() {
  const cesiumContainer = useRef(null)
  const viewerRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [currentLayer, setCurrentLayer] = useState('satellite')
  const [viewerInstance, setViewerInstance] = useState(null)
  const cesiumContainerRef = useRef(null);
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwNTZmYzAwNS03MDU3LTQ1MGYtYjJkNC1kMmFjNzUxODU5OWUiLCJpZCI6Mzg4MDk1LCJpYXQiOjE3NzA0NTQ5NTd9.4DzniAg6qD-wNw_E0t75ytmPCkba163P2u_XIIjYNFU'

    const initViewer = () => {
      try {
        // 創建 Cesium Viewer - 不指定 terrainProvider 讓它使用預設值
        const viewer = new Cesium.Viewer(cesiumContainer.current, {
          baseLayerPicker: false,
          geocoder: false,
          homeButton: true,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: true,
        })

        viewerRef.current = viewer
        setViewerInstance(viewer)

        // 設置初始視圖
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(114.1694, 22.3193, 10000), // 香港
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0.0
          }
        })

        // 更新比例尺函數 - 使用拾取地球表面兩點來準確計算
        const updateScale = () => {
          const scene = viewer.scene
          const canvas = scene.canvas
          const ellipsoid = scene.globe.ellipsoid
          
          // 比例尺條的像素寬度
          const pixelWidth = 100
          
          // 獲取畫布底部中心點
          const centerX = canvas.clientWidth / 2
          const bottomY = canvas.clientHeight - 50 // 距離底部 50px
          
          // 拾取左右兩個點
          const leftPixel = new Cesium.Cartesian2(centerX - pixelWidth / 2, bottomY)
          const rightPixel = new Cesium.Cartesian2(centerX + pixelWidth / 2, bottomY)
          
          // 將像素座標轉換為地球表面的 3D 座標
          const leftPosition = viewer.camera.pickEllipsoid(leftPixel, ellipsoid)
          const rightPosition = viewer.camera.pickEllipsoid(rightPixel, ellipsoid)
          
          if (leftPosition && rightPosition) {
            // 將 3D 座標轉換為經緯度
            const leftCartographic = ellipsoid.cartesianToCartographic(leftPosition)
            const rightCartographic = ellipsoid.cartesianToCartographic(rightPosition)
            
            // 使用 Cesium 的大地測量學計算地球表面兩點間的準確距離
            const geodesic = new Cesium.EllipsoidGeodesic(leftCartographic, rightCartographic)
            const distance = geodesic.surfaceDistance // 地表距離（米）
            
            // 格式化距離顯示
            let scaleText
            if (distance >= 1000) {
              scaleText = `${(distance / 1000).toFixed(1)} km`
            } else {
              scaleText = `${Math.round(distance)} m`
            }
            
            const scaleLabel = document.getElementById('scale-label')
            if (scaleLabel) {
              scaleLabel.textContent = scaleText
            }
          }
        }

        // 監聽相機移動事件
        viewer.camera.moveEnd.addEventListener(updateScale)
        viewer.camera.changed.addEventListener(updateScale)
        
        // 初始更新
        updateScale()
      } catch (error) {
        console.error('Failed to initialize Cesium viewer:', error)
      }
    }

    initViewer()


    // 清理函數
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
      }
    }
  }, [])

  // 搜尋地點功能
  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      // 使用 Nominatim API 進行地理編碼
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

  // 選擇搜尋結果
  const handleSelectResult = (result) => {
    if (!viewerRef.current) return

    const lon = parseFloat(result.lon)
    const lat = parseFloat(result.lat)

    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, 5000),
      duration: 2
    })

    setShowResults(false)
    setSearchQuery('')
  }

  // 切換地圖圖層
  const switchLayer = async (layerType) => {
    if (!viewerRef.current) return

    const imageryLayers = viewerRef.current.imageryLayers

    // 移除現有圖層
    imageryLayers.removeAll()

    try {
      let provider
      
      // 根據選擇添加新圖層
      switch (layerType) {
        case 'satellite':
          provider = await Cesium.IonImageryProvider.fromAssetId(3)
          break
        case 'street':
          provider = new Cesium.OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/'
          })
          break
        default:
          provider = await Cesium.IonImageryProvider.fromAssetId(3)
      }

      imageryLayers.addImageryProvider(provider)
      setCurrentLayer(layerType)
    } catch (error) {
      console.error('Layer switching failed', error)
      // 如果失敗，恢復預設圖層
      const defaultProvider = await Cesium.IonImageryProvider.fromAssetId(3)
      imageryLayers.addImageryProvider(defaultProvider)
    }
  }

  return (
    <div className="map-container">
      <div ref={cesiumContainer} className="cesium-viewer" />
      
      {/* 搜尋框 */}
      <div className="search-container">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations"
            className="search-input"
          />
          <button type="submit" className="search-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </form>
        
        {/* 搜尋結果 */}
        {showResults && searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="search-result-item"
                onClick={() => handleSelectResult(result)}
              >
                <div className="result-name">{result.display_name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 圖層切換器 */}
      <div className="layer-switcher">
        <button
          className={`layer-button ${currentLayer === 'satellite' ? 'active' : ''}`}
          onClick={() => switchLayer('satellite')}
          title="satellite image"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>
        <button
          className={`layer-button ${currentLayer === 'street' ? 'active' : ''}`}
          onClick={() => switchLayer('street')}
          title="Street map"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
          </svg>
        </button>
      </div>

      {viewerInstance && (
        <CesiumCompass viewer={viewerInstance} />
      )}
      
      {/* 比例尺 */}
      <div className="scale-bar" id="scale-bar">
        <div className="scale-bar-line"></div>
        <div className="scale-bar-label" id="scale-label">1000 m</div>
      </div>
    </div>
  )
}

export default MapView
