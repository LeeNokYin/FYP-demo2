import { useEffect, useState } from 'react'
import * as Cesium from 'cesium'

const INITIAL_TELEMETRY = {
  heading: '-',
  pitch: '-',
  roll: '-',
  distance: '-',
  wgsLat: '-',
  wgsLon: '-'
}

function calculateScaleBar(metersPerPixel, maxWidthPx) {
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0 || !Number.isFinite(maxWidthPx) || maxWidthPx <= 0) {
    return null
  }

  const maxMeters = metersPerPixel * maxWidthPx
  if (!Number.isFinite(maxMeters) || maxMeters <= 0) {
    return null
  }

  const magnitude = Math.pow(10, Math.floor(Math.log10(maxMeters)))
  const normalized = maxMeters / magnitude

  let multiplier = 1
  if (normalized >= 5) {
    multiplier = 5
  } else if (normalized >= 2) {
    multiplier = 2
  }

  const distance = multiplier * magnitude
  const widthPx = distance / metersPerPixel
  const label = distance >= 1000 ? `${distance / 1000} km` : `${distance} m`

  return {
    distance,
    label,
    widthPx
  }
}

export function useCameraHud(viewer) {
  const [cameraTelemetry, setCameraTelemetry] = useState(INITIAL_TELEMETRY)
  const [scaleBar, setScaleBar] = useState({ label: '2000 m', widthPx: 100 })

  useEffect(() => {
    if (!viewer) return undefined

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

    const getScaleBar = () => {
      const scene = viewer.scene
      const canvas = scene.canvas
      const ellipsoid = scene.globe.ellipsoid
      const sampleWidthPx = 100
      const maxScaleWidthPx = 240

      const centerX = canvas.clientWidth / 2
      const bottomY = canvas.clientHeight - 50

      const leftPixel = new Cesium.Cartesian2(centerX - sampleWidthPx / 2, bottomY)
      const rightPixel = new Cesium.Cartesian2(centerX + sampleWidthPx / 2, bottomY)

      const leftPosition = viewer.camera.pickEllipsoid(leftPixel, ellipsoid)
      const rightPosition = viewer.camera.pickEllipsoid(rightPixel, ellipsoid)

      if (!leftPosition || !rightPosition) {
        return null
      }

      const leftCartographic = ellipsoid.cartesianToCartographic(leftPosition)
      const rightCartographic = ellipsoid.cartesianToCartographic(rightPosition)

      const geodesic = new Cesium.EllipsoidGeodesic(leftCartographic, rightCartographic)
      const distance = geodesic.surfaceDistance
      const metersPerPixel = distance / sampleWidthPx

      return calculateScaleBar(metersPerPixel, maxScaleWidthPx)
    }

    const updateHud = () => {
      const nextScaleBar = getScaleBar()
      if (nextScaleBar) {
        setScaleBar((prev) => {
          if (prev.label === nextScaleBar.label && Math.abs(prev.widthPx - nextScaleBar.widthPx) < 0.5) {
            return prev
          }
          return nextScaleBar
        })
      }

      updateCameraTelemetry()
    }

    const THROTTLE_MS = 120
    let frameId = null
    let pending = false
    let lastUpdated = 0

    const scheduleHudUpdate = () => {
      const now = performance.now()

      if (now - lastUpdated >= THROTTLE_MS) {
        lastUpdated = now
        updateHud()
        return
      }

      if (pending) return
      pending = true

      frameId = requestAnimationFrame(() => {
        pending = false
        lastUpdated = performance.now()
        updateHud()
      })
    }

    viewer.camera.moveEnd.addEventListener(updateHud)
    viewer.camera.changed.addEventListener(scheduleHudUpdate)
    window.addEventListener('resize', updateHud)

    updateHud()

    return () => {
      viewer.camera.moveEnd.removeEventListener(updateHud)
      viewer.camera.changed.removeEventListener(scheduleHudUpdate)
      window.removeEventListener('resize', updateHud)
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [viewer])

  return {
    cameraTelemetry,
    scaleLabel: scaleBar.label,
    scaleWidthPx: scaleBar.widthPx
  }
}
