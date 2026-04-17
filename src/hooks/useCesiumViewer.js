import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'

export function useCesiumViewer() {
  const cesiumContainerRef = useRef(null)
  const viewerRef = useRef(null)
  const [viewer, setViewer] = useState(null)

  useEffect(() => {
    if (!cesiumContainerRef.current) return undefined

    const ionAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN?.trim()
    if (ionAccessToken) {
      Cesium.Ion.defaultAccessToken = ionAccessToken
    }

    let instance = null

    try {
      instance = new Cesium.Viewer(cesiumContainerRef.current, {
        baseLayerPicker: false,
        geocoder: false,
        homeButton: true,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: true,
        imageryProvider: false,
        baseLayer: false
      })

      instance.imageryLayers.removeAll()
      instance.scene.screenSpaceCameraController.enableCollisionDetection = true
      instance.scene.screenSpaceCameraController.minimumZoomDistance = 10
      instance.scene.globe.depthTestAgainstTerrain = true

      instance.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(114.164124, 22.384675, 110000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0.0
        }
      })

      viewerRef.current = instance
      setViewer(instance)
    } catch (error) {
      console.error('Failed to initialize Cesium viewer:', error)
    }

    return () => {
      if (instance) {
        instance.destroy()
      }
      viewerRef.current = null
      setViewer(null)
    }
  }, [])

  return {
    cesiumContainerRef,
    viewer,
    viewerRef
  }
}
