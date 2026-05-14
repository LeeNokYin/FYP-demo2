import { useCallback, useEffect, useRef } from 'react'
import * as Cesium from 'cesium'

const MIN_ABS_PITCH_DEG = 1
const MAX_ABS_PITCH_DEG = 89
const ZOOM_STEP_DISTANCE = 500

export function useCameraControls(viewer) {
  const lastOrbitRef = useRef({
    target: null,
    range: 0
  })
  const zoomVelocityRef = useRef(0)
  const zoomFrameRef = useRef(null)

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

  const stopZoomInertia = useCallback(() => {
    if (zoomFrameRef.current) {
      cancelAnimationFrame(zoomFrameRef.current)
      zoomFrameRef.current = null
    }
    zoomVelocityRef.current = 0
  }, [])

  const startZoomInertia = useCallback((direction) => {
    if (!viewer) return

    const height = viewer.camera.positionCartographic?.height ?? 100000
    const impulse = Cesium.Math.clamp(height * 0.15, ZOOM_STEP_DISTANCE, 150000)

    zoomVelocityRef.current = Cesium.Math.clamp(
      zoomVelocityRef.current + direction * impulse,
      -220000,
      220000
    )

    if (zoomFrameRef.current) return

    const tick = () => {
      if (!viewer) {
        stopZoomInertia()
        return
      }

      const speed = Math.abs(zoomVelocityRef.current)
      if (speed < 140) {
        stopZoomInertia()
        return
      }

      if (zoomVelocityRef.current > 0) {
        viewer.camera.zoomIn(speed)
      } else {
        viewer.camera.zoomOut(speed)
      }

      zoomVelocityRef.current *= 0.82
      zoomFrameRef.current = requestAnimationFrame(tick)
    }

    zoomFrameRef.current = requestAnimationFrame(tick)
  }, [stopZoomInertia, viewer])

  const handleZoomIn = useCallback(() => {
    startZoomInertia(1)
  }, [startZoomInertia])

  const handleZoomOut = useCallback(() => {
    startZoomInertia(-1)
  }, [startZoomInertia])

  const handleResetView = useCallback(() => {
    if (!viewer) return

    stopZoomInertia()

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(114.164124, 22.384675, 110000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0.0
      },
      duration: 1.2
    })
  }, [stopZoomInertia, viewer])

  useEffect(() => {
    return () => {
      stopZoomInertia()
    }
  }, [stopZoomInertia])

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
