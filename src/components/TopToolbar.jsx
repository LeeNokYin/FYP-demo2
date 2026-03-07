import * as Cesium from 'cesium'

function TopToolbar({ viewer, topPanels, toggleTopPanel, toggleLeftPanel }) {
  return (
    <header className="top-toolbar">
      <div className="toolbar-logo">
        <span>🌍 EA Planner</span>
      </div>
      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button className="tool-btn" title="Location" onClick={() => alert('Location Selector')}>
          🌍
        </button>
        <button className="tool-btn" title="Home" onClick={() => {
          viewer?.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(114.17, 22.32, 15000),
            duration: 2
          })
        }}>
          🏠
        </button>
        <button
          className={`tool-btn ${topPanels.projectManager ? 'active' : ''}`}
          title="Project Manager"
          onClick={() => toggleTopPanel('projectManager')}
        >
          📁
        </button>
        <button
          className={`tool-btn ${topPanels.modelManager ? 'active' : ''}`}
          title="Model Manager"
          onClick={() => toggleTopPanel('modelManager')}
        >
          🏗️
        </button>
        <button
          className={`tool-btn ${topPanels.layerManager ? 'active' : ''}`}
          title="Layer Manager"
          onClick={() => toggleTopPanel('layerManager')}
        >
          🗂️
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button className="tool-btn" title="Climate Wizard" onClick={() => toggleLeftPanel('climate')}>
          🌤️
        </button>
        <button
          className={`tool-btn ${topPanels.assessmentWizard ? 'active' : ''}`}
          title="Assessment Wizard"
          onClick={() => toggleTopPanel('assessmentWizard')}
        >
          📊
        </button>
        <button
          className={`tool-btn ${topPanels.monitoringWizard ? 'active' : ''}`}
          title="Monitoring Wizard"
          onClick={() => toggleTopPanel('monitoringWizard')}
        >
          🔍
        </button>
        <button className="tool-btn" title="Presentation Wizard" onClick={() => toggleLeftPanel('presentation')}>
          🎬
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-icons">
        <button className="tool-btn" title="Search" onClick={() => alert('Search Location')}>🔍</button>
        <button className="tool-btn" title="Settings" onClick={() => alert('Settings')}>⚙️</button>
        <button className="tool-btn" title="Help" onClick={() => alert('Help')}>❓</button>
        <button className="tool-btn" title="User" onClick={() => alert('User Profile')}>👤</button>
        <button className="tool-btn primary" title="Logout" onClick={() => alert('Logout')}>➡️</button>
      </div>
    </header>
  )
}

export default TopToolbar