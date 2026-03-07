function TopPanels({ topPanels, topPanelPositions, toggleTopPanel, toggleVoiceDashboard }) {
  const getPanelStyle = (panelKey) => {
    const position = topPanelPositions?.[panelKey]
    if (!position) return undefined

    return {
      left: `${position.left}px`,
      top: `${position.top}px`
    }
  }

  return (
    <>
      {topPanels.projectManager && (
        <div className="top-panel project-manager-panel" style={getPanelStyle('projectManager')}>
          <div className="panel-header">
            <h3>📁 Project Manager</h3>
            <button className="panel-close" onClick={() => toggleTopPanel('projectManager')}>×</button>
          </div>
          <div className="panel-content">
            <div className="project-list">
              <div className="project-item">
                <span className="project-code">MH IVE</span>
                <span className="project-version">v1.0</span>
                <span className="project-name">GSLS Tree Project</span>
                <span className="project-stage">Initial Planning</span>
                <div className="project-actions">
                  <button className="btn-sm">✏️ Edit</button>
                  <button className="btn-sm">📋 Copy</button>
                  <button className="btn-sm">⬇️ Download</button>
                  <button className="btn-sm danger">🗑️ Delete</button>
                </div>
              </div>
            </div>
            <button className="btn-primary mt-3">+ Create New Project</button>
          </div>
        </div>
      )}

      {topPanels.modelManager && (
        <div className="top-panel model-manager-panel" style={getPanelStyle('modelManager')}>
          <div className="panel-header">
            <h3>🏗️ Model Manager</h3>
            <button className="panel-close" onClick={() => toggleTopPanel('modelManager')}>×</button>
          </div>
          <div className="panel-content">
            <div className="upload-section">
              <label>Upload Models</label>
              <p className="help-text">Supported formats: .3dm, .ifc, .obj, .skp, .tif, .geojson, .zip</p>
              <input type="file" multiple accept=".3dm,.ifc,.obj,.skp,.tif,.geojson,.zip" />
            </div>
            <div className="model-list">
              <p className="empty-state">No models uploaded yet</p>
            </div>
          </div>
        </div>
      )}

      {topPanels.layerManager && (
        <div className="top-panel layer-manager-panel" style={getPanelStyle('layerManager')}>
          <div className="panel-header">
            <h3>🗂️ Layer Manager</h3>
            <button className="panel-close" onClick={() => toggleTopPanel('layerManager')}>×</button>
          </div>
          <div className="panel-content">
            <input type="text" className="search-input" placeholder="Search layers..." />
            <div className="layer-groups">
              <div className="layer-group">
                <h4>General</h4>
                <label className="layer-item">
                  <input type="checkbox" /> OZP
                  <input type="range" className="layer-opacity" min="0" max="1" step="0.1" />
                </label>
                <label className="layer-item">
                  <input type="checkbox" /> District Boundaries
                  <input type="range" className="layer-opacity" min="0" max="1" step="0.1" />
                </label>
              </div>
              <div className="layer-group">
                <h4>Environmental</h4>
                <label className="layer-item">
                  <input type="checkbox" /> Buildings
                  <input type="range" className="layer-opacity" min="0" max="1" step="0.1" />
                </label>
                <label className="layer-item">
                  <input type="checkbox" /> Bathing Beach
                  <input type="range" className="layer-opacity" min="0" max="1" step="0.1" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {topPanels.assessmentWizard && (
        <div className="top-panel assessment-panel" style={getPanelStyle('assessmentWizard')}>
          <div className="panel-header">
            <h3>📊 Assessment Wizard</h3>
            <button className="panel-close" onClick={() => toggleTopPanel('assessmentWizard')}>×</button>
          </div>
          <div className="panel-content">
            <div className="assessment-options">
              <button className="assessment-btn">
                <img src="/images/influence.png" alt="" width="24" />
                <span>Influence Analysis</span>
              </button>
              <button className="assessment-btn">
                <img src="/images/assessmentWizard/windAssesments.png" alt="" width="24" />
                <span>Air Ventilation</span>
              </button>
              <button className="assessment-btn">
                <img src="/images/assessmentWizard/noise.png" alt="" width="24" />
                <span>Noise Impact Assessment</span>
              </button>
              <button className="assessment-btn">
                <img src="/images/assessmentWizard/air.png" alt="" width="24" />
                <span>Air Impact Assessment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {topPanels.monitoringWizard && (
        <div className="top-panel monitoring-panel" style={getPanelStyle('monitoringWizard')}>
          <div className="panel-header">
            <h3>🔍 Ecological Monitoring</h3>
            <button className="panel-close" onClick={() => toggleTopPanel('monitoringWizard')}>×</button>
          </div>
          <div className="panel-content">
            <div className="monitoring-types">
              <div className="monitoring-card">
                <img src="/images/monitorWizard/camera.png" alt="" width="32" />
                <h4>Voice Sensors</h4>
                <p>View live camera feeds</p>
                <button className="btn-sm">Open Dashboard</button>
              </div>
              <div className="monitoring-card">
                <img src="/images/monitorWizard/sound-sensor.png" alt="" width="32" />
                <h4>Sound Sensors</h4>
                <p>Monitor noise levels</p>
                <button className="btn-sm" onClick={() => {
                  toggleVoiceDashboard()
                  toggleTopPanel('monitoringWizard')
                }}>Open Dashboard</button>
              </div>
              <div className="monitoring-card">
                <img src="/images/monitorWizard/monitoring-devices.png" alt="" width="32" />
                <h4>Bird Monitoring</h4>
                <p>Track bird activity</p>
                <button className="btn-sm">Open Dashboard</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TopPanels