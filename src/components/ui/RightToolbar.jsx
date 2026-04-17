import { useCallback, useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import { transformHK1980ToWGS84, transformWGS84ToHK1980 } from '../../services/coordinateTransform'
import { useCameraControls } from '../../hooks/useCameraControls'
import './RightToolbar.css'
import './SharedControls.css'

function RightToolbar({ viewer, showPinPanel, onTogglePinPanel }) {
  const [pinMode, setPinMode] = useState(false)
  const [pinCoordinates, setPinCoordinates] = useState([])
  const [manualHkE, setManualHkE] = useState('')
  const [manualHkN, setManualHkN] = useState('')
  const [manualPinError, setManualPinError] = useState('')
  const [isManualPinLoading, setIsManualPinLoading] = useState(false)
  const pinEntitiesRef = useRef([])
  const { handleZoomIn, handleResetView, handleZoomOut } = useCameraControls(viewer)

  const appendPinEntity = useCallback((pinEntity) => {
    if (!viewer) return

    pinEntitiesRef.current = [...pinEntitiesRef.current, pinEntity]
    if (pinEntitiesRef.current.length > 5) {
      const oldestPinEntity = pinEntitiesRef.current.shift()
      if (oldestPinEntity) {
        viewer.entities.remove(oldestPinEntity)
      }
    }
  }, [viewer])

  const appendPinCoordinate = (newCoordinate) => {
    setPinCoordinates((prev) => {
      const next = [...prev, newCoordinate]
      if (next.length > 5) {
        next.shift()
      }
      return next
    })
  }

  useEffect(() => {
    if (!viewer || !showPinPanel || !pinMode) return

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    const updatePinByClick = (movement) => {
      const scene = viewer.scene
      const ellipsoid = scene.globe.ellipsoid

      let cartesian = scene.pickPosition(movement.position)
      if (!Cesium.defined(cartesian)) {
        cartesian = viewer.camera.pickEllipsoid(movement.position, ellipsoid)
      }
      if (!Cesium.defined(cartesian)) return

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
      const lon = Cesium.Math.toDegrees(cartographic.longitude)
      const lat = Cesium.Math.toDegrees(cartographic.latitude)
      const height = cartographic.height

      let hkE = '-'
      let hkN = '-'
      try {
        const transformed = transformWGS84ToHK1980(lat, lon)
        if (transformed?.hkE != null) {
          hkE = Number(transformed.hkE).toFixed(3)
        }
        if (transformed?.hkN != null) {
          hkN = Number(transformed.hkN).toFixed(3)
        }
      } catch (error) {
        console.error('Transform WGS84 -> HK1980 failed:', error)
      }

      const pinEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, height),
        point: {
          pixelSize: 12,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2
        }
      })

      appendPinEntity(pinEntity)

      appendPinCoordinate({
        longitude: lon.toFixed(6),
        latitude: lat.toFixed(6),
        height: `${Math.round(height)} m`,
        hkE,
        hkN
      })
    }

    handler.setInputAction(updatePinByClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    return () => {
      handler.destroy()
    }
  }, [viewer, showPinPanel, pinMode, appendPinEntity])

  useEffect(() => {
    if (showPinPanel) return
    setPinMode(false)
  }, [showPinPanel])

  const clearAllPins = () => {
    if (!viewer) return

    pinEntitiesRef.current.forEach((pinEntity) => viewer.entities.remove(pinEntity))
    pinEntitiesRef.current = []
    setPinCoordinates([])
    setManualPinError('')
  }

  const handleManualHkPin = (event) => {
    event.preventDefault()
    if (!viewer) return

    const eValue = Number(manualHkE)
    const nValue = Number(manualHkN)

    if (!Number.isFinite(eValue) || !Number.isFinite(nValue)) {
      setManualPinError('Please enter valid numeric values for HK1980 Easting and Northing.')
      return
    }

    setManualPinError('')
    setIsManualPinLoading(true)

    try {
      const transformed = transformHK1980ToWGS84(eValue, nValue)
      const lat = Number(transformed?.wgsLat)
      const lon = Number(transformed?.wgsLong)

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error('Invalid WGS84 coordinate result from transform API')
      }

      const pinEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        point: {
          pixelSize: 12,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2
        }
      })

      appendPinEntity(pinEntity)
      appendPinCoordinate({
        longitude: lon.toFixed(6),
        latitude: lat.toFixed(6),
        height: '0 m',
        hkE: eValue.toFixed(3),
        hkN: nValue.toFixed(3)
      })

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1500),
        duration: 1.2
      })
    } catch (error) {
      console.error('Transform HK1980 -> WGS84 failed:', error)
      setManualPinError('Coordinate transform failed. Please verify E/N values and try again.')
    } finally {
      setIsManualPinLoading(false)
    }
  }

  return (
    <div className="right-toolbar">
      <button
        className={`toolbar-btn ${showPinPanel ? 'active' : ''}`}
        onClick={onTogglePinPanel}
        title="Pin Tool"
        aria-label="Toggle pin tool panel"
        aria-pressed={showPinPanel}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      </button>

      {showPinPanel && (
        <div className="right-toolbar-debug right-toolbar-pin-panel">
          <button
            className={`btn-sm right-toolbar-debug-pin-btn ${pinMode ? 'active' : ''}`}
            onClick={() => setPinMode((prev) => !prev)}
            type="button"
          >
            {pinMode ? 'Pin Mode: ON' : 'Pin Mode: OFF'}
          </button>
          <button
            className="btn-sm right-toolbar-debug-pin-btn"
            onClick={clearAllPins}
            type="button"
          >
            Clear Pins
          </button>

          <form className="right-toolbar-debug-form" onSubmit={handleManualHkPin}>
            <div className="right-toolbar-debug-title">Manual HK1980 Input</div>
            <input
              className="right-toolbar-debug-input"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="Easting (E)"
              value={manualHkE}
              onChange={(event) => setManualHkE(event.target.value)}
            />
            <input
              className="right-toolbar-debug-input"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="Northing (N)"
              value={manualHkN}
              onChange={(event) => setManualHkN(event.target.value)}
            />
            <button className="btn-sm right-toolbar-debug-pin-btn" type="submit" disabled={isManualPinLoading}>
              {isManualPinLoading ? 'Transforming...' : 'Drop Pin from HK1980'}
            </button>
            {manualPinError && <div className="right-toolbar-debug-error">{manualPinError}</div>}
          </form>

          <div className="right-toolbar-debug-title">Pin Coordinates</div>
          {pinCoordinates.length === 0 && <div>-</div>}
          {pinCoordinates.map((pinCoordinate, index) => (
            <div key={`${pinCoordinate.longitude}-${pinCoordinate.latitude}-${index}`}>
              #{index + 1} WGS84 (Lon, Lat): {pinCoordinate.longitude}, {pinCoordinate.latitude}, H: {pinCoordinate.height} | HK1980 (E, N): {pinCoordinate.hkE ?? '-'}, {pinCoordinate.hkN ?? '-'}
            </div>
          ))}
        </div>
      )}

      <div className="right-toolbar-controls">
        <button className="toolbar-btn" onClick={handleZoomIn} title="Zoom in" aria-label="Zoom in">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="20" y1="20" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <button className="toolbar-btn" onClick={handleResetView} title="Reset View" aria-label="Reset view">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.8V21h14V9.8" />
          </svg>
        </button>
        <button className="toolbar-btn" onClick={handleZoomOut} title="Zoom out" aria-label="Zoom out">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="20" y1="20" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default RightToolbar
