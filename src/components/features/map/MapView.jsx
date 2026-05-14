import { useEffect, useRef, useState } from 'react'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import ViewCube from './ViewCube'
import './MapView.css'
import TopToolbar from '../../ui/TopToolbar'
import TopPanels from '../../ui/TopPanels'
import RightToolbar from '../../ui/RightToolbar'
import VoiceMonitoring from '../audio/VoiceMonitoring'
import CctvMonitoring from '../cctv/CctvMonitoring'
import CctvMonitoringTesting from '../cctv/CctvMonitoringTesting'
import BirdListPanel from '../cctv/BirdListPanel'
import CarbonCalculator from '../carbon/CarbonCalculator'
import Hk3DMapControls from './Hk3DMapControls'
import { useCesiumViewer } from '../../../hooks/useCesiumViewer'
import { useMapLayer } from '../../../hooks/useMapLayer'
import { useCameraHud } from '../../../hooks/useCameraHud'
import { useLocationSearch } from '../../../hooks/useLocationSearch'

const LAYER_PICKER_CONTAINER_ID = 'official-layer-picker'

function MapView() {
  const mapContainerRef = useRef(null)
  const { cesiumContainerRef, viewer, viewerRef } = useCesiumViewer()
  const { currentLayer, toggleHk3DMap } = useMapLayer(viewer, LAYER_PICKER_CONTAINER_ID)
  const { cameraTelemetry, scaleLabel, scaleWidthPx } = useCameraHud(viewer)
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    showResults,
    handleSearch,
    handleSelectResult
  } = useLocationSearch(viewerRef)
  const [topPanels, setTopPanels] = useState({
    monitoringWizard: false
  })
  const [topPanelPositions, setTopPanelPositions] = useState({})
  const [showVoice, setShowVoice] = useState(false)
  const [showCctvMonitoring, setShowCctvMonitoring] = useState(false)
  const [showCctvMonitoringTesting, setShowCctvMonitoringTesting] = useState(false)
  const [showBirdList, setShowBirdList] = useState(false)
  const [showCarbonCalculator, setShowCarbonCalculator] = useState(false)
  const [showPinPanel, setShowPinPanel] = useState(false)
  const [showTopToolbar, setShowTopToolbar] = useState(true)

  const closeAllTopPanels = () => {
    setTopPanels((prev) => Object.keys(prev).reduce((acc, key) => {
      acc[key] = false
      return acc
    }, {}))
  }

  const closeEcologicalMonitoringPanels = () => {
    setShowVoice(false)
    setShowCctvMonitoring(false)
    setShowCctvMonitoringTesting(false)
    setShowBirdList(false)
  }

  const toggleTopPanel = (panel, anchorElement) => {
    setTopPanels((prev) => {
      const isOpening = !prev[panel]
      const next = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false
        return acc
      }, {})

      if (isOpening) {
        next[panel] = true
      }

      return next
    })

    if (anchorElement && mapContainerRef.current) {
      const containerRect = mapContainerRef.current.getBoundingClientRect()
      const buttonRect = anchorElement.getBoundingClientRect()
      const panelWidth = 340
      const minLeft = 12
      const maxLeft = Math.max(minLeft, containerRect.width - panelWidth - 12)
      const centerAlignedLeft = buttonRect.left - containerRect.left + buttonRect.width / 2 - panelWidth / 2

      setTopPanelPositions((prev) => ({
        ...prev,
        [panel]: {
          left: Math.min(maxLeft, Math.max(minLeft, centerAlignedLeft)),
          top: buttonRect.bottom - containerRect.top + 8
        }
      }))
    }
  }

  const handleTopPanelToggle = (panel, anchorElement) => {
    if (panel === 'monitoringWizard') {
      setShowCarbonCalculator(false)
    }

    toggleTopPanel(panel, anchorElement)
  }

  const openMonitoringPanelExclusive = (panel) => {
    closeEcologicalMonitoringPanels()
    setShowVoice(panel === 'voice')
    setShowCctvMonitoring(panel === 'cctv')
    setShowCctvMonitoringTesting(panel === 'cctvDetectedOnly')
    setShowBirdList(panel === 'birdList')
    setShowCarbonCalculator(false)
  }

  const handleCarbonCalculatorClick = () => {
    setShowCarbonCalculator((prev) => {
      const isOpening = !prev
      if (isOpening) {
        closeAllTopPanels()
        closeEcologicalMonitoringPanels()
      }

      return isOpening
    })
  }

  useEffect(() => {
    if (!showVoice && !showCctvMonitoring && !showCctvMonitoringTesting && !showBirdList && !showCarbonCalculator) return undefined

    const handleEscapeClose = (event) => {
      if (event.key !== 'Escape') return

      if (showCctvMonitoring) {
        setShowCctvMonitoring(false)
        return
      }

      if (showCctvMonitoringTesting) {
        setShowCctvMonitoringTesting(false)
        return
      }

      if (showVoice) {
        setShowVoice(false)
        return
      }

      if (showBirdList) {
        setShowBirdList(false)
        return
      }

      if (showCarbonCalculator) {
        setShowCarbonCalculator(false)
      }
    }

    window.addEventListener('keydown', handleEscapeClose)

    return () => {
      window.removeEventListener('keydown', handleEscapeClose)
    }
  }, [showVoice, showCctvMonitoring, showCctvMonitoringTesting, showBirdList, showCarbonCalculator])

  return (
    <div className="map-container" ref={mapContainerRef}>
      <div ref={cesiumContainerRef} className="cesium-viewer" />

      {!showTopToolbar && (
        <button
          className="toolbar-toggle-fallback"
          type="button"
          title="Show top toolbar"
          aria-label="Show top toolbar"
          onClick={() => setShowTopToolbar(true)}
        >
          ☰
        </button>
      )}

      {viewer && showTopToolbar && (
        <TopToolbar
          topPanels={topPanels}
          toggleTopPanel={handleTopPanelToggle}
          showTopToolbar={showTopToolbar}
          onToggleTopToolbar={() => setShowTopToolbar((prev) => !prev)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchSubmit={handleSearch}
          searchResults={searchResults}
          showResults={showResults}
          onSelectResult={handleSelectResult}
          onCarbonCalculatorClick={handleCarbonCalculatorClick}
        />
      )}

      <TopPanels
        topPanels={topPanels}
        topPanelPositions={topPanelPositions}
        toggleTopPanel={handleTopPanelToggle}
        openMonitoringPanelExclusive={openMonitoringPanelExclusive}
      />

      <RightToolbar
        viewer={viewer}
        showPinPanel={showPinPanel}
        onTogglePinPanel={() => setShowPinPanel((prev) => !prev)}
      />

      <div id={LAYER_PICKER_CONTAINER_ID} className="official-layer-picker" />

      <Hk3DMapControls
        isActive={currentLayer === 'hk3d'}
        onToggleMap={toggleHk3DMap}
      />

      {viewer && <ViewCube viewer={viewer} />}
      
      {/* 比例尺 */}
      <div className="camera-info-panel">
        <div className="camera-info-title">Camera Info</div>
        <div className="camera-info-row"><span>Angle (H/P/R)</span><span>{cameraTelemetry.heading} / {cameraTelemetry.pitch} / {cameraTelemetry.roll}</span></div>
        <div className="camera-info-row"><span>Distance</span><span>{cameraTelemetry.distance}</span></div>
        <div className="camera-info-row"><span>WGS84 (Lat, Lon)</span><span>{cameraTelemetry.wgsLat}, {cameraTelemetry.wgsLon}</span></div>
      </div>

      <div className="scale-bar" aria-label="Map scale">
        <div className="scale-bar-line" style={{ width: `${Math.max(20, Math.round(scaleWidthPx ?? 100))}px` }}></div>
        <div className="scale-bar-label">{scaleLabel}</div>
      </div>

      {/* Voice 監控面板 */}
      {showVoice && (
        <VoiceMonitoring onClose={() => setShowVoice(false)} />
      )}

      {showCctvMonitoring && (
        <CctvMonitoring onClose={() => setShowCctvMonitoring(false)} />
      )}

      {showCctvMonitoringTesting && (
        <CctvMonitoringTesting onClose={() => setShowCctvMonitoringTesting(false)} />
      )}

      {showBirdList && (
        <BirdListPanel viewer={viewer} onClose={() => setShowBirdList(false)} />
      )}

      {showCarbonCalculator && (
        <CarbonCalculator onClose={() => setShowCarbonCalculator(false)} />
      )}
    </div>
  )
}

export default MapView
