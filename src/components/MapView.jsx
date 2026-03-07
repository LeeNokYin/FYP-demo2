import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import CesiumCompass from './CesiumCompass'
import './MapView.css'
import Toolbar from './Toolbar'
import TopToolbar from './TopToolbar'
import TopPanels from './TopPanels'
import RightToolbar from './RightToolbar'
import CCTVDashboard from './CCTVDashboard'
import BirdAnalyticsDashboard from './BirdAnalyticsDashboard'


function MapView() {
  // 香港邊界矩形（西、南、東、北）
  const HK_BOUNDS = Cesium.Rectangle.fromDegrees(113.76, 22.13, 114.44, 22.58)
  
  const cesiumContainer = useRef(null)
  const viewerRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [currentLayer, setCurrentLayer] = useState('arcgis')
  const [terrainEnabled, setTerrainEnabled] = useState(false)
  const [viewerInstance, setViewerInstance] = useState(null)
  const worldTerrainProviderRef = useRef(null)
  const cesiumContainerRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [activeTool, setActiveTool] = useState('viewpoint')
  const [topPanels, setTopPanels] = useState({
    projectManager: false,
    modelManager: false,
    layerManager: false,
    assessmentWizard: false,
    monitoringWizard: false
  })
  const [activeLeftPanel, setActiveLeftPanel] = useState(null)
  const [showCCTVDashboard, setShowCCTVDashboard] = useState(false)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [showPinPanel, setShowPinPanel] = useState(false)
  const [cameraTelemetry, setCameraTelemetry] = useState({
    heading: '-',
    pitch: '-',
    roll: '-',
    distance: '-',
    wgsLat: '-',
    wgsLon: '-'
  })

  const activateTool = (tool) => {
    setActiveTool(tool)
  }

  const toggleTopPanel = (panel) => {
    setTopPanels((prev) => ({
      ...prev,
      [panel]: !prev[panel]
    }))
  }

  const toggleLeftPanel = (panel) => {
    setActiveLeftPanel((prev) => (prev === panel ? null : panel))
  }

  const toggleCCTVDashboard = () => {
    setShowCCTVDashboard((prev) => !prev)
  }

  const handleViewAnalytics = (data) => {
    setAnalyticsData(data)
  }

  const getWorldTerrainProvider = async () => {
    if (!worldTerrainProviderRef.current) {
      worldTerrainProviderRef.current = await Cesium.createWorldTerrainAsync()
    }
    return worldTerrainProviderRef.current
  }

  useEffect(() => {
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwNTZmYzAwNS03MDU3LTQ1MGYtYjJkNC1kMmFjNzUxODU5OWUiLCJpZCI6Mzg4MDk1LCJpYXQiOjE3NzA0NTQ5NTd9.4DzniAg6qD-wNw_E0t75ytmPCkba163P2u_XIIjYNFU'

    const initViewer = () => {
      try {
        // 建立 Cesium Viewer，且不載入任何預設圖層
        const viewer = new Cesium.Viewer(cesiumContainer.current, {
          baseLayerPicker: false,
          geocoder: false,
          homeButton: true,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: true,
          imageryProvider: false,  // 停用預設影像提供者
          baseLayer: false  // 停用基底圖層
        })

        // 移除所有預設圖層
        viewer.imageryLayers.removeAll()

        viewerRef.current = viewer
        setViewerInstance(viewer)

        // 設定初始視角
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(114.1694, 22.3193, 10000), // 香港
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0.0
          }
        })

        const formatDistance = (distanceMeters) => {
          if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
            return '-'
          }
          if (distanceMeters >= 1000) {
            return `${(distanceMeters / 1000).toFixed(2)} km`
          }
          return `${Math.round(distanceMeters)} m`
        }

        const updateCameraTelemetry = () => {
          const scene = viewer.scene
          const canvas = scene.canvas
          const ellipsoid = scene.globe.ellipsoid
          const cameraCartographic = viewer.camera.positionCartographic

          if (!cameraCartographic) return

          const lon = Cesium.Math.toDegrees(cameraCartographic.longitude)
          const lat = Cesium.Math.toDegrees(cameraCartographic.latitude)
          const heading = (Cesium.Math.toDegrees(viewer.camera.heading) + 360) % 360
          const pitch = Cesium.Math.toDegrees(viewer.camera.pitch)
          const roll = Cesium.Math.toDegrees(viewer.camera.roll)

          const centerPixel = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)
          let targetPosition = scene.pickPosition(centerPixel)
          if (!Cesium.defined(targetPosition)) {
            targetPosition = viewer.camera.pickEllipsoid(centerPixel, ellipsoid)
          }

          const distanceText = Cesium.defined(targetPosition)
            ? formatDistance(Cesium.Cartesian3.distance(viewer.camera.position, targetPosition))
            : formatDistance(cameraCartographic.height)

          setCameraTelemetry((prev) => ({
            ...prev,
            heading: `${heading.toFixed(1)}°`,
            pitch: `${pitch.toFixed(1)}°`,
            roll: `${roll.toFixed(1)}°`,
            distance: distanceText,
            wgsLat: lat.toFixed(6),
            wgsLon: lon.toFixed(6)
          }))
        }

        // 透過取樣地球表面兩點來更新比例尺
        const updateScale = () => {
          const scene = viewer.scene
          const canvas = scene.canvas
          const ellipsoid = scene.globe.ellipsoid
          
          // 比例尺的像素寬度
          const pixelWidth = 100
          
          // 取得畫布底部中央點
          const centerX = canvas.clientWidth / 2
          const bottomY = canvas.clientHeight - 50 // 距離底部 50px
          
          // 取左側與右側點
          const leftPixel = new Cesium.Cartesian2(centerX - pixelWidth / 2, bottomY)
          const rightPixel = new Cesium.Cartesian2(centerX + pixelWidth / 2, bottomY)
          
          // 將像素座標轉換為地球表面的 3D 位置
          const leftPosition = viewer.camera.pickEllipsoid(leftPixel, ellipsoid)
          const rightPosition = viewer.camera.pickEllipsoid(rightPixel, ellipsoid)
          
          if (leftPosition && rightPosition) {
            // 將 3D 位置轉換為地理座標
            const leftCartographic = ellipsoid.cartesianToCartographic(leftPosition)
            const rightCartographic = ellipsoid.cartesianToCartographic(rightPosition)
            
            // 使用 Cesium 測地線計算較精確的地表距離
            const geodesic = new Cesium.EllipsoidGeodesic(leftCartographic, rightCartographic)
            const distance = geodesic.surfaceDistance // 地表距離（公尺）
            
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

          updateCameraTelemetry()
        }

        // 監聽相機移動事件
        viewer.camera.moveEnd.addEventListener(updateScale)
        viewer.camera.changed.addEventListener(updateScale)
        
        // 初始更新
        updateScale()

        // 載入預設圖層（ArcGIS World Imagery）
        const loadDefaultLayer = async () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = 256
            canvas.height = 256
            const ctx = canvas.getContext('2d')
            ctx.fillStyle = '#d0d0d0'
            ctx.fillRect(0, 0, 256, 256)

            const backgroundProvider = new Cesium.SingleTileImageryProvider({
              url: canvas.toDataURL(),
              tileWidth: 256,
              tileHeight: 256
            })
            viewer.imageryLayers.addImageryProvider(backgroundProvider)

            // 將 ArcGIS World Imagery 加入為預設圖層
            const arcgisProvider = new Cesium.UrlTemplateImageryProvider({
              url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            })
            const layer = viewer.imageryLayers.addImageryProvider(arcgisProvider)
            layer.rectangle = HK_BOUNDS
            viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider()
            setCurrentLayer('arcgis')
            setTerrainEnabled(false)
          } catch (error) {
            console.error('Failed to load default layer:', error)
          }
        }

        loadDefaultLayer()
      } catch (error) {
        console.error('Failed to initialize Cesium viewer:', error)
      }
    }

    initViewer()


  // 清理函式
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
      }
    }
  }, [])

  // 地點搜尋功能
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

  // 選取搜尋結果
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
  const switchLayer = async (layerType, useTerrain = terrainEnabled) => {
    if (!viewerRef.current) return

    const imageryLayers = viewerRef.current.imageryLayers
    // 移除現有圖層
    imageryLayers.removeAll()

    // 加入預設背景圖層（簡單灰色背景）
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#d0d0d0'
      ctx.fillRect(0, 0, 256, 256)

      const backgroundProvider = new Cesium.SingleTileImageryProvider({
        url: canvas.toDataURL(),
        tileWidth: 256,
        tileHeight: 256
      })
      imageryLayers.addImageryProvider(backgroundProvider)
    } catch (e) {
      console.log('Using default background')
    }

    try {
      let provider

      // 依照選擇的圖層建立影像提供者
      switch (layerType) {
        case 'arcgis':
          provider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          })
          break
        case 'osm':
          provider = new Cesium.OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/'
          })
          break
        case 'none':
          provider = null
          break
        default:
          provider = null
      }

      // 加入圖層並限制可視範圍在香港
      if (provider) {
        const layer = imageryLayers.addImageryProvider(provider)
        layer.rectangle = HK_BOUNDS
      }

      if (useTerrain) {
        viewerRef.current.terrainProvider = await getWorldTerrainProvider()
      } else {
        viewerRef.current.terrainProvider = new Cesium.EllipsoidTerrainProvider()
      }

    } catch (error) {
      console.error('Layer switch failed:', error)
    }
  }

  const toggleBaseLayer = async (layerType) => {
    if (currentLayer === layerType) {
      setCurrentLayer('none')
      await switchLayer('none', false)
      setTerrainEnabled(false)
      return
    }

    setCurrentLayer(layerType)
    await switchLayer(layerType, false)
    setTerrainEnabled(false)
  }

  const toggleTerrainForCurrentLayer = async () => {
    if (!viewerRef.current) return

    try {
      if (terrainEnabled) {
        viewerRef.current.terrainProvider = new Cesium.EllipsoidTerrainProvider()
        setTerrainEnabled(false)
      } else {
        viewerRef.current.terrainProvider = await getWorldTerrainProvider()
        setTerrainEnabled(true)
      }
    } catch (error) {
      console.error('Toggle terrain failed:', error)
    }
  }

  return (
    <div className="map-container">
      <div ref={cesiumContainer} className="cesium-viewer" />

      {viewerInstance && (
        <TopToolbar
          viewer={viewerInstance}
          topPanels={topPanels}
          toggleTopPanel={toggleTopPanel}
          toggleLeftPanel={toggleLeftPanel}
        />
      )}

      <TopPanels topPanels={topPanels} toggleTopPanel={toggleTopPanel} toggleCCTVDashboard={toggleCCTVDashboard} />

      <RightToolbar
        viewer={viewerInstance}
        activeTool={activeTool}
        activateTool={activateTool}
        showPinPanel={showPinPanel}
      />

      <Toolbar viewer={viewerInstance} />
      
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
          className={`layer-button ${currentLayer === 'arcgis' ? 'active' : 'inactive'}`}
          onClick={() => toggleBaseLayer('arcgis')}
          title="ArcGIS World Imagery"
          disabled={currentLayer === 'arcgis'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>
        <button
          className={`layer-button ${currentLayer === 'osm' ? 'active' : 'inactive'}`}
          onClick={() => toggleBaseLayer('osm')}
          title="OpenStreetMap"
          disabled={currentLayer === 'osm'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
          </svg>
        </button>
        <button
          className={`layer-button ${terrainEnabled ? 'active' : 'inactive'}`}
          onClick={toggleTerrainForCurrentLayer}
          title="Cesium World Terrain"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v2H3v-2zm1-2h16l-4.5-7-3.5 5-2.5-3.5L4 16z"/>
          </svg>
        </button>
        <button
          className={`layer-button ${showPinPanel ? 'active' : 'inactive'}`}
          onClick={() => setShowPinPanel((prev) => !prev)}
          title="Pin Tool"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </button>
      </div>

      {viewerInstance && (
        <CesiumCompass viewer={viewerInstance} />
      )}
      
      {/* 比例尺 */}
      <div className="camera-info-panel">
        <div className="camera-info-title">Camera Info</div>
        <div className="camera-info-row"><span>Angle (H/P/R)</span><span>{cameraTelemetry.heading} / {cameraTelemetry.pitch} / {cameraTelemetry.roll}</span></div>
        <div className="camera-info-row"><span>Distance</span><span>{cameraTelemetry.distance}</span></div>
        <div className="camera-info-row"><span>WGS84 (Lat, Lon)</span><span>{cameraTelemetry.wgsLat}, {cameraTelemetry.wgsLon}</span></div>
      </div>

      <div className="scale-bar" id="scale-bar">
        <div className="scale-bar-line"></div>
        <div className="scale-bar-label" id="scale-label">1000 m</div>
      </div>

      {/* CCTV 儀表板 */}
      {showCCTVDashboard && (
        <div className="dashboard-overlay">
          <div className="dashboard-modal">
            <button className="dashboard-close" onClick={() => setShowCCTVDashboard(false)}>×</button>
            <CCTVDashboard onViewAnalytics={handleViewAnalytics} />
          </div>
        </div>
      )}

      {/* 鳥類分析儀表板 */}
      {analyticsData && (
        <BirdAnalyticsDashboard
          data={analyticsData}
          onClose={() => setAnalyticsData(null)}
        />
      )}
    </div>
  )
}

export default MapView
