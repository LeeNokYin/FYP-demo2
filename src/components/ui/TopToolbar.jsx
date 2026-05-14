import { useState } from 'react'
import './TopToolbar.css'
import './SharedControls.css'

const WORKFLOW_BUTTONS = [
  { key: 'carbon', icon: '♻️', title: 'Carbon Calculator', type: 'action' },
  { key: 'monitoringWizard', icon: '🔍', title: 'Monitoring Wizard', type: 'top-panel' },
]

function TopToolbar({
  topPanels,
  toggleTopPanel,
  toggleLeftPanel,
  showTopToolbar,
  onToggleTopToolbar,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  searchResults,
  showResults,
  onSelectResult,
  onCarbonCalculatorClick
}) {
  const safeTopPanels = topPanels || {}
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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

  const handleToggleTopToolbar = () => {
    if (typeof onToggleTopToolbar === 'function') {
      onToggleTopToolbar()
    }
    setIsSettingsOpen(false)
  }

  return (
    <header className="top-toolbar">
      <div className="toolbar-group">
        {WORKFLOW_BUTTONS.map((button) => (
          <button
            key={button.key}
            className={`tool-btn ${button.type === 'top-panel' && safeTopPanels[button.key] ? 'active' : ''}`}
            title={button.title}
            aria-label={button.title}
            aria-pressed={button.type === 'top-panel' ? !!safeTopPanels[button.key] : undefined}
            onClick={(event) => handleWorkflowClick(button, event)}
          >
            {button.icon}
          </button>
        ))}
      </div>

      <div className="toolbar-search-wrap">
        <form className="toolbar-search-form" onSubmit={onSearchSubmit}>
          <button type="submit" className="toolbar-search-btn" title="Search" aria-label="Submit location search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <input
            type="text"
            className="toolbar-search-input"
            aria-label="Search location"
            value={searchQuery}
            onChange={(event) => {
              if (typeof onSearchQueryChange === 'function') {
                onSearchQueryChange(event.target.value)
              }
            }}
            placeholder="Search location"
          />
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
                aria-label={`Select search result ${result.display_name}`}
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-icons">
        <div className="toolbar-settings">
          <button
            className={`tool-btn ${isSettingsOpen ? 'active' : ''}`}
            title="Settings"
            aria-label="Open settings"
            aria-expanded={isSettingsOpen}
            aria-haspopup="menu"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            type="button"
          >
            ⚙️
          </button>

          {isSettingsOpen && (
            <div className="toolbar-settings-menu" role="menu" aria-label="Toolbar settings">
              <button
                type="button"
                className="toolbar-settings-item"
                onClick={handleToggleTopToolbar}
              >
                {showTopToolbar ? 'Hide top toolbar' : 'Show top toolbar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopToolbar