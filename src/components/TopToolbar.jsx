import './TopToolbar.css'
import './SharedControls.css'

const PANEL_BUTTONS = [
  { key: 'projectManager', icon: '📁', title: 'Project Manager' },
  { key: 'modelManager', icon: '🏗️', title: 'Model Manager' },
  { key: 'layerManager', icon: '🗂️', title: 'Layer Manager' }
]

const WORKFLOW_BUTTONS = [
  { key: 'climate', icon: '🌤️', title: 'Climate Wizard', type: 'left-panel' },
  { key: 'carbon', icon: '♻️', title: 'Carbon Calculator', type: 'action' },
  { key: 'assessmentWizard', icon: '📊', title: 'Assessment Wizard', type: 'top-panel' },
  { key: 'monitoringWizard', icon: '🔍', title: 'Monitoring Wizard', type: 'top-panel' },
  { key: 'presentation', icon: '🎬', title: 'Presentation Wizard', type: 'left-panel' }
]

function TopToolbar({
  topPanels,
  toggleTopPanel,
  toggleLeftPanel,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  searchResults,
  showResults,
  onSelectResult,
  onCarbonCalculatorClick
}) {
  const safeTopPanels = topPanels || {}

  const handlePanelClick = (panelKey, event) => {
    toggleTopPanel(panelKey, event.currentTarget)
  }

  const handleWorkflowClick = (button, event) => {
    if (button.type === 'top-panel') {
      toggleTopPanel(button.key, event.currentTarget)
      return
    }

    if (button.type === 'left-panel') {
      if (typeof toggleLeftPanel === 'function') {
        toggleLeftPanel(button.key)
      }
      return
    }

    if (typeof onCarbonCalculatorClick === 'function') {
      onCarbonCalculatorClick()
    }
  }

  return (
    <header className="top-toolbar">
      <div className="toolbar-group">
        {PANEL_BUTTONS.map((button) => (
          <button
            key={button.key}
            className={`tool-btn ${safeTopPanels[button.key] ? 'active' : ''}`}
            title={button.title}
            onClick={(event) => handlePanelClick(button.key, event)}
          >
            {button.icon}
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        {WORKFLOW_BUTTONS.map((button) => (
          <button
            key={button.key}
            className={`tool-btn ${button.type === 'top-panel' && safeTopPanels[button.key] ? 'active' : ''}`}
            title={button.title}
            onClick={(event) => handleWorkflowClick(button, event)}
          >
            {button.icon}
          </button>
        ))}
      </div>

      <div className="toolbar-search-wrap">
        <form className="toolbar-search-form" onSubmit={onSearchSubmit}>
          <input
            type="text"
            className="toolbar-search-input"
            value={searchQuery}
            onChange={(event) => {
              if (typeof onSearchQueryChange === 'function') {
                onSearchQueryChange(event.target.value)
              }
            }}
            placeholder="Search location"
          />
          <button type="submit" className="toolbar-search-btn" title="Search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </form>

        {showResults && searchResults.length > 0 && (
          <div className="toolbar-search-results">
            {searchResults.map((result, index) => (
              <button
                key={`${result.place_id ?? 'result'}-${index}`}
                type="button"
                className="toolbar-search-result-item"
                onClick={() => onSelectResult(result)}
                title={result.display_name}
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-icons">
        <button className="tool-btn" title="Settings" onClick={() => alert('Settings')}>⚙️</button>
      </div>
    </header>
  )
}

export default TopToolbar