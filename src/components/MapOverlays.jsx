import SoundDashboard from './SoundDashboard'
import SoundSensorDashboard from './SoundSensorDashboard'

function MapOverlays({
  currentLayer,
  terrainEnabled,
  showPinPanel,
  onToggleBaseLayer,
  onToggleTerrain,
  onTogglePinPanel,
  cameraTelemetry,
  showSoundDashboard,
  onCloseSoundDashboard,
  onViewAnalytics,
  analyticsData,
  onCloseAnalytics
}) {
  return (
    <>
      {/* 图层切换器 */}
      <div className="layer-switcher">
        <button
          className={`layer-button ${currentLayer === 'arcgis' ? 'active' : 'inactive'}`}
          onClick={() => onToggleBaseLayer('arcgis')}
          title="ArcGIS World Imagery"
          disabled={currentLayer === 'arcgis'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>
        <button
          className={`layer-button ${currentLayer === 'osm' ? 'active' : 'inactive'}`}
          onClick={() => onToggleBaseLayer('osm')}
          title="OpenStreetMap"
          disabled={currentLayer === 'osm'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
          </svg>
        </button>
        <button
          className={`layer-button ${terrainEnabled ? 'active' : 'inactive'}`}
          onClick={onToggleTerrain}
          title="Cesium World Terrain"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v2H3v-2zm1-2h16l-4.5-7-3.5 5-2.5-3.5L4 16z"/>
          </svg>
        </button>
        <button
          className={`layer-button ${showPinPanel ? 'active' : 'inactive'}`}
          onClick={onTogglePinPanel}
          title="Pin Tool"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </button>
      </div>

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

      {/* Sound 仪表板 */}
      {showSoundDashboard && (
        <div className="dashboard-overlay">
          <div className="dashboard-modal">
            <button className="dashboard-close" onClick={onCloseSoundDashboard}>x</button>
            <SoundDashboard onViewAnalytics={onViewAnalytics} />
          </div>
        </div>
      )}

      {/* Sound Sensor 仪表板 */}
      {analyticsData && (
        <SoundSensorDashboard
          data={analyticsData}
          onClose={onCloseAnalytics}
        />
      )}
    </>
  )
}

export default MapOverlays
