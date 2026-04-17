import { useCallback, useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'

const HK_BOUNDS = Cesium.Rectangle.fromDegrees(113.76, 22.13, 114.44, 22.58)
const HK_3D_TILESET_BASE_URL = 'https://data.map.gov.hk/api/3d-data/meshmodel/WGS84/tileset.json'
const LEGACY_HK_3D_TILESET_KEY = 'ad5940a63bd344c48b0351ef1c7a905e'
const HK_3D_CAMERA_PRESET = {
  lat: 22.275626,
  lon: 114.177537,
  distanceMeters: 90,
  headingDeg: 16.2,
  pitchDeg: -44.3,
  rollDeg: 360
}
const LANDSD_ICON_URL = 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%228%22 fill=%22%231a2a3a%22/%3E%3Ccircle cx=%2250%22 cy=%2216%22 r=%226%22 fill=%22%23ffd166%22/%3E%3Cpath d=%22M6 50l16-18 10 11 8-8 18 15v8H6z%22 fill=%22%234ecdc4%22/%3E%3Cpath d=%22M6 56h52%22 stroke=%22%23b8fff8%22 stroke-width=%224%22/%3E%3C/svg%3E'

const createBackgroundProvider = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#d0d0d0'
  ctx.fillRect(0, 0, 256, 256)

  return new Cesium.SingleTileImageryProvider({
    url: canvas.toDataURL(),
    tileWidth: 256,
    tileHeight: 256
  })
}

const createImageryProvider = (layerType) => {
  switch (layerType) {
    case 'arcgis':
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      })
    case 'landsd':
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/imagery/WGS84/{z}/{x}/{y}.png',
        credit: 'Aerial Photograph from Lands Department'
      })
    case 'osm':
      return new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/'
      })
    case 'hk3d':
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/imagery/WGS84/{z}/{x}/{y}.png',
        credit: '© Map from Lands Department'
      })
    default:
      return null
  }
}

const buildHk3DTilesetCandidates = () => {
  const explicitTilesetUrl = import.meta.env.VITE_HK_3D_TILESET_URL?.trim()
  const hk3DApiKey = import.meta.env.VITE_HK_3D_TILESET_KEY?.trim()
  const fallbackKey = hk3DApiKey || LEGACY_HK_3D_TILESET_KEY

  const candidates = []

  if (explicitTilesetUrl) {
    candidates.push(explicitTilesetUrl)
  }

  if (fallbackKey) {
    candidates.push(`${HK_3D_TILESET_BASE_URL}?key=${fallbackKey}`)
  }

  candidates.push(HK_3D_TILESET_BASE_URL)

  return [...new Set(candidates)]
}

const loadHk3DTileset = async () => {
  const candidates = buildHk3DTilesetCandidates()

  let lastError = null

  for (const url of candidates) {
    try {
      return await Cesium.Cesium3DTileset.fromUrl(url)
    } catch (error) {
      lastError = error
      console.warn(`HK 3D tileset load failed for ${url}`, error)
    }
  }

  throw lastError || new Error('Unable to load HK 3D tileset from any configured URL')
}

export function useMapLayer(viewer, layerPickerContainerId) {
  const [currentLayer, setCurrentLayer] = useState('arcgis')
  const [terrainEnabled, setTerrainEnabled] = useState(false)

  const worldTerrainProviderRef = useRef(null)
  const hkTilesetRef = useRef(null)
  const baseLayerPickerRef = useRef(null)
  const layerViewModelsRef = useRef({
    arcgis: null,
    landsd: null,
    osm: null,
    ellipsoid: null,
    worldTerrain: null
  })
  const lastNonHkLayerRef = useRef('arcgis')
  const lastTerrainEnabledRef = useRef(false)

  useEffect(() => {
    if (currentLayer !== 'hk3d') {
      lastNonHkLayerRef.current = currentLayer
      lastTerrainEnabledRef.current = terrainEnabled
    }
  }, [currentLayer, terrainEnabled])

  const getWorldTerrainProvider = useCallback(async () => {
    if (!worldTerrainProviderRef.current) {
      worldTerrainProviderRef.current = await Cesium.createWorldTerrainAsync()
    }
    return worldTerrainProviderRef.current
  }, [])

  const removeHkMeshLayer = useCallback(() => {
    if (!viewer || !hkTilesetRef.current) return

    viewer.scene.primitives.remove(hkTilesetRef.current)
    hkTilesetRef.current = null
  }, [viewer])

  const switchLayer = useCallback(
    async (layerType, useTerrain) => {
      if (!viewer) return

      const imageryLayers = viewer.imageryLayers
      imageryLayers.removeAll()

      try {
        imageryLayers.addImageryProvider(createBackgroundProvider())
      } catch {
        console.log('Using default background')
      }

      try {
        const provider = createImageryProvider(layerType)

        if (provider) {
          imageryLayers.addImageryProvider(provider)
        }

        if (useTerrain) {
          viewer.terrainProvider = await getWorldTerrainProvider()
        } else {
          viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider()
        }
      } catch (error) {
        console.error('Layer switch failed:', error)
      }
    },
    [getWorldTerrainProvider, viewer]
  )

  const enableHk3DMap = useCallback(async () => {
    if (!viewer) return

    try {
      setCurrentLayer('hk3d')
      await switchLayer('hk3d', false)
      setTerrainEnabled(false)

      if (!hkTilesetRef.current) {
        hkTilesetRef.current = await loadHk3DTileset()
        viewer.scene.primitives.add(hkTilesetRef.current)
      }

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          HK_3D_CAMERA_PRESET.lon,
          HK_3D_CAMERA_PRESET.lat,
          HK_3D_CAMERA_PRESET.distanceMeters
        ),
        orientation: {
          heading: Cesium.Math.toRadians(HK_3D_CAMERA_PRESET.headingDeg),
          pitch: Cesium.Math.toRadians(HK_3D_CAMERA_PRESET.pitchDeg),
          roll: Cesium.Math.toRadians(HK_3D_CAMERA_PRESET.rollDeg)
        },
        duration: 0
      })
    } catch (error) {
      console.error('Failed to enable HK 3D map:', error)
    }
  }, [switchLayer, viewer])

  const toggleHk3DMap = useCallback(async () => {
    if (!viewer) return

    if (currentLayer === 'hk3d') {
      removeHkMeshLayer()

      const restoreLayer = lastNonHkLayerRef.current
      const restoreTerrain = lastTerrainEnabledRef.current
      const restoreTerrainViewModel = restoreTerrain
        ? layerViewModelsRef.current.worldTerrain
        : layerViewModelsRef.current.ellipsoid

      if (baseLayerPickerRef.current) {
        baseLayerPickerRef.current.viewModel.selectedTerrain = restoreTerrainViewModel
      }

      await switchLayer(restoreLayer, restoreTerrain)
      setCurrentLayer(restoreLayer)
      setTerrainEnabled(restoreTerrain)
      return
    }

    await enableHk3DMap()
  }, [currentLayer, enableHk3DMap, removeHkMeshLayer, switchLayer, viewer])

  useEffect(() => {
    if (!viewer) return undefined

    const layerPickerContainer = document.getElementById(layerPickerContainerId)
    if (!layerPickerContainer) {
      console.error('BaseLayerPicker container not found')
      return undefined
    }

    const arcgisViewModel = new Cesium.ProviderViewModel({
      name: 'ArcGIS World Imagery',
      iconUrl: Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/ArcGisMapServiceWorldImagery.png'),
      tooltip: 'ArcGIS World Imagery',
      category: 'Imagery',
      creationFunction: () => createImageryProvider('arcgis')
    })

    const osmViewModel = new Cesium.ProviderViewModel({
      name: 'OpenStreetMap',
      iconUrl: Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
      tooltip: 'OpenStreetMap',
      category: 'Imagery',
      creationFunction: () => createImageryProvider('osm')
    })

    const landsdViewModel = new Cesium.ProviderViewModel({
      name: 'LandsD Imagery (WGS84)',
      iconUrl: LANDSD_ICON_URL,
      tooltip: 'LandsD Imagery Map API (WGS84)',
      category: 'Imagery',
      creationFunction: () => createImageryProvider('landsd')
    })

    const ellipsoidTerrainViewModel = new Cesium.ProviderViewModel({
      name: 'WGS84 Ellipsoid',
      iconUrl: Cesium.buildModuleUrl('Widgets/Images/TerrainProviders/Ellipsoid.png'),
      tooltip: 'No terrain',
      category: 'Terrain',
      creationFunction: () => new Cesium.EllipsoidTerrainProvider()
    })

    const worldTerrainViewModel = new Cesium.ProviderViewModel({
      name: 'Cesium World Terrain',
      iconUrl: Cesium.buildModuleUrl('Widgets/Images/TerrainProviders/CesiumWorldTerrain.png'),
      tooltip: 'Cesium World Terrain',
      category: 'Terrain',
      creationFunction: () => getWorldTerrainProvider()
    })

    layerViewModelsRef.current = {
      arcgis: arcgisViewModel,
      landsd: landsdViewModel,
      osm: osmViewModel,
      ellipsoid: ellipsoidTerrainViewModel,
      worldTerrain: worldTerrainViewModel
    }

    const baseLayerPicker = new Cesium.BaseLayerPicker(layerPickerContainer, {
      globe: viewer.scene.globe,
      imageryProviderViewModels: [arcgisViewModel, landsdViewModel, osmViewModel],
      selectedImageryProviderViewModel: arcgisViewModel,
      terrainProviderViewModels: [ellipsoidTerrainViewModel, worldTerrainViewModel],
      selectedTerrainProviderViewModel: ellipsoidTerrainViewModel
    })

    baseLayerPickerRef.current = baseLayerPicker

    const imagerySubscription = Cesium.knockout
      .getObservable(baseLayerPicker.viewModel, 'selectedImagery')
      .subscribe((selectedImagery) => {
        const selectedTerrain = baseLayerPicker.viewModel.selectedTerrain
        const useTerrain = selectedTerrain === layerViewModelsRef.current.worldTerrain

        if (selectedImagery === layerViewModelsRef.current.arcgis) {
          removeHkMeshLayer()
          void switchLayer('arcgis', useTerrain)
          setCurrentLayer('arcgis')
          return
        }

        if (selectedImagery === layerViewModelsRef.current.osm) {
          removeHkMeshLayer()
          void switchLayer('osm', useTerrain)
          setCurrentLayer('osm')
          return
        }

        if (selectedImagery === layerViewModelsRef.current.landsd) {
          removeHkMeshLayer()
          void switchLayer('landsd', useTerrain)
          setCurrentLayer('landsd')
          return
        }

        setCurrentLayer('none')
      })

    const terrainSubscription = Cesium.knockout
      .getObservable(baseLayerPicker.viewModel, 'selectedTerrain')
      .subscribe((selectedTerrain) => {
        setTerrainEnabled(selectedTerrain === layerViewModelsRef.current.worldTerrain)
      })

    setCurrentLayer('arcgis')
    setTerrainEnabled(false)

    return () => {
      imagerySubscription.dispose()
      terrainSubscription.dispose()
      if (baseLayerPickerRef.current) {
        baseLayerPickerRef.current.destroy()
        baseLayerPickerRef.current = null
      }
    }
  }, [getWorldTerrainProvider, layerPickerContainerId, removeHkMeshLayer, switchLayer, viewer])

  useEffect(() => {
    return () => {
      removeHkMeshLayer()
    }
  }, [removeHkMeshLayer])

  return {
    currentLayer,
    toggleHk3DMap
  }
}
