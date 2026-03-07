function TopToolbar({ topPanels, toggleTopPanel, toggleLeftPanel }) {
  return (
    <header className="top-toolbar">
      <div className="toolbar-group">
        <button
          className={`tool-btn ${topPanels.projectManager ? 'active' : ''}`}
          title="Project Manager"
          onClick={(event) => toggleTopPanel('projectManager', event.currentTarget)}
        >
          📁
        </button>
        <button
          className={`tool-btn ${topPanels.modelManager ? 'active' : ''}`}
          title="Model Manager"
          onClick={(event) => toggleTopPanel('modelManager', event.currentTarget)}
        >
          🏗️
        </button>
        <button
          className={`tool-btn ${topPanels.layerManager ? 'active' : ''}`}
          title="Layer Manager"
          onClick={(event) => toggleTopPanel('layerManager', event.currentTarget)}
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
          onClick={(event) => toggleTopPanel('assessmentWizard', event.currentTarget)}
        >
          📊
        </button>
        <button
          className={`tool-btn ${topPanels.monitoringWizard ? 'active' : ''}`}
          title="Monitoring Wizard"
          onClick={(event) => toggleTopPanel('monitoringWizard', event.currentTarget)}
        >
          🔍
        </button>
        <button className="tool-btn" title="Presentation Wizard" onClick={() => toggleLeftPanel('presentation')}>
          🎬
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-icons">
        <button className="tool-btn" title="Settings" onClick={() => alert('Settings')}>⚙️</button>
      </div>
    </header>
  )
}

export default TopToolbar