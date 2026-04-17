import { useCallback, useRef } from 'react'
import * as Cesium from 'cesium'

const MIN_ABS_PITCH_DEG = 1
const MAX_ABS_PITCH_DEG = 89

export function useCameraControls(viewer) {
  const lastOrbitRef = useRef({
    target: null,
    range: 0
  })

  const clampPitchAvoidHorizontal = useCallback((pitchRad, fallbackSign = -1) => {
    const minAbs = Cesium.Math.toRadians(MIN_ABS_PITCH_DEG)
    const maxAbs = Cesium.Math.toRadians(MAX_ABS_PITCH_DEG)

    let clamped = Cesium.Math.clamp(pitchRad, -maxAbs, maxAbs)
    if (Math.abs(clamped) < minAbs) {
      const sign = clamped === 0 ? (fallbackSign >= 0 ? 1 : -1) : Math.sign(clamped)
      clamped = sign * minAbs
    }

    return clamped
  }, [])

  const resolveOrbitTarget = useCallback(() => {
    if (!viewer) return null

    const scene = viewer.scene
    const ellipsoid = scene.globe.ellipsoid
    const canvas = scene.canvas
    const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)

    let target = scene.pickPosition(center)
    if (!Cesium.defined(target)) {
      target = viewer.camera.pickEllipsoid(center, ellipsoid)
    }

    if (!Cesium.defined(target)) {
      if (Cesium.defined(lastOrbitRef.current.target) && lastOrbitRef.current.range > 0) {
        return lastOrbitRef.current
      }
      return null
    }

    const range = Cesium.Cartesian3.distance(viewer.camera.positionWC, target)
    if (!Number.isFinite(range) || range <= 0) {
      if (Cesium.defined(lastOrbitRef.current.target) && lastOrbitRef.current.range > 0) {
        return lastOrbitRef.current
      }
      return null
    }

    lastOrbitRef.current = { target, range }
    return lastOrbitRef.current
  }, [viewer])

  const flyToOrientation = useCallback((headingDeg, pitchDeg, duration = 1.0) => {
    if (!viewer) return

    const orbit = resolveOrbitTarget()
    if (!orbit) return

    const sphere = new Cesium.BoundingSphere(orbit.target, 1.0)
    const clampedPitch = clampPitchAvoidHorizontal(Cesium.Math.toRadians(pitchDeg), -1)

    viewer.camera.flyToBoundingSphere(sphere, {
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(headingDeg),
        clampedPitch,
        orbit.range
      ),
      duration,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
    })
  }, [clampPitchAvoidHorizontal, resolveOrbitTarget, viewer])

  const applyLookAt = useCallback((target, heading, pitch, range) => {
    if (!viewer || !Cesium.defined(target)) return

    viewer.camera.lookAt(
      target,
      new Cesium.HeadingPitchRange(heading, pitch, range)
    )
  }, [viewer])

  const finishDrag = useCallback((dragRef, setDraggingState) => {
    if (!viewer) return

    dragRef.current.active = false
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
    setDraggingState(false)
  }, [viewer])

  const handleZoomIn = useCallback(() => {
    if (!viewer) return
    viewer.camera.zoomIn(75000)
  }, [viewer])

  const handleZoomOut = useCallback(() => {
    if (!viewer) return
    viewer.camera.zoomOut(75000)
  }, [viewer])

  const handleResetView = useCallback(() => {
    if (!viewer) return

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(114.164124, 22.384675, 110000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0.0
      },
      duration: 1.2
    })
  }, [viewer])

  return {
    clampPitchAvoidHorizontal,
    resolveOrbitTarget,
    flyToOrientation,
    applyLookAt,
    finishDrag,
    handleZoomIn,
    handleZoomOut,
    handleResetView
  }
}
