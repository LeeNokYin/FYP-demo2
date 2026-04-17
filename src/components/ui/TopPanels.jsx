import './TopPanels.css'
import './SharedControls.css'

function PanelShell({ panelKey, title, className, getPanelStyle, toggleTopPanel, children }) {
  return (
    <div className={`top-panel ${className}`} style={getPanelStyle(panelKey)}>
      <div className="panel-header">
        <h3>{title}</h3>
        <button className="panel-close" onClick={() => toggleTopPanel(panelKey)}>×</button>
      </div>
      <div className="panel-content">{children}</div>
    </div>
  )
}

function TopPanels({ topPanels, topPanelPositions, toggleTopPanel, toggleVoice, toggleCctvMonitoring, toggleBirdList }) {
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
        <PanelShell
          panelKey="projectManager"
          title="📁 Project Manager"
          className="project-manager-panel"
          getPanelStyle={getPanelStyle}
          toggleTopPanel={toggleTopPanel}
        >
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
        </PanelShell>
      )}

      {topPanels.modelManager && (
        <PanelShell
          panelKey="modelManager"
          title="🏗️ Model Manager"
          className="model-manager-panel"
          getPanelStyle={getPanelStyle}
          toggleTopPanel={toggleTopPanel}
        >
          <div className="upload-section">
            <label>Upload Models</label>
            <p className="help-text">Supported formats: .3dm, .ifc, .obj, .skp, .tif, .geojson, .zip</p>
            <input type="file" multiple accept=".3dm,.ifc,.obj,.skp,.tif,.geojson,.zip" />
          </div>
          <div className="model-list">
            <p className="empty-state">No models uploaded yet</p>
          </div>
        </PanelShell>
      )}

      {topPanels.layerManager && (
        <PanelShell
          panelKey="layerManager"
          title="🗂️ Layer Manager"
          className="layer-manager-panel"
          getPanelStyle={getPanelStyle}
          toggleTopPanel={toggleTopPanel}
        >
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
        </PanelShell>
      )}

      {topPanels.assessmentWizard && (
        <PanelShell
          panelKey="assessmentWizard"
          title="📊 Assessment Wizard"
          className="assessment-panel"
          getPanelStyle={getPanelStyle}
          toggleTopPanel={toggleTopPanel}
        >
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
        </PanelShell>
      )}

      {topPanels.monitoringWizard && (
        <PanelShell
          panelKey="monitoringWizard"
          title="🔍 Ecological Monitoring"
          className="monitoring-panel"
          getPanelStyle={getPanelStyle}
          toggleTopPanel={toggleTopPanel}
        >
          <div className="monitoring-types">
            <div className="monitoring-card">
              <img src="/images/monitorWizard/camera.png" alt="" width="32" />
              <h4>CctvMonitoring</h4>
              <p>View live camera feeds</p>
              <button className="btn-sm" onClick={() => {
                toggleCctvMonitoring()
                toggleTopPanel('monitoringWizard')
              }}>Open Dashboard</button>
            </div>
            <div className="monitoring-card">
              <img src="/images/monitorWizard/sound-sensor.png" alt="" width="32" />
              <h4>Voice</h4>
              <p>Monitor noise levels</p>
              <button className="btn-sm" onClick={() => {
                toggleVoice()
                toggleTopPanel('monitoringWizard')
              }}>Open Dashboard</button>
            </div>
            <div className="monitoring-card">
              <img src="/images/monitorWizard/monitoring-devices.png" alt="" width="32" />
              <h4>List of bird</h4>
              <p></p>
              <button className="btn-sm" onClick={() => {
                toggleBirdList()
                toggleTopPanel('monitoringWizard')
              }}>Open Dashboard</button>
            </div>
          </div>
        </PanelShell>
      )}
    </>
  )
}

export default TopPanels