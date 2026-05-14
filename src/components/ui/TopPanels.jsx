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

function TopPanels({ topPanels, topPanelPositions, toggleTopPanel, openMonitoringPanelExclusive }) {
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
              <h4>CCTV Monitoring</h4>
             
              <button className="btn-sm" onClick={() => {
                openMonitoringPanelExclusive('cctv')
                toggleTopPanel('monitoringWizard')
              }}>Open Panel</button>
            </div>
            <div className="monitoring-card">
              <h4>CCTV Monitoring (Detected Only)</h4>
              <p>Detected images only</p>
              <button className="btn-sm" onClick={() => {
                openMonitoringPanelExclusive('cctvDetectedOnly')
                toggleTopPanel('monitoringWizard')
              }}>Open Panel</button>
            </div>
            <div className="monitoring-card">
              <h4>Voice Monitoring</h4>
              
              <button className="btn-sm" onClick={() => {
                openMonitoringPanelExclusive('voice')
                toggleTopPanel('monitoringWizard')
              }}>Open Panel</button>
            </div>
            <div className="monitoring-card">
              <h4>Bird location</h4>
              <p></p>
              <button className="btn-sm" onClick={() => {
                openMonitoringPanelExclusive('birdList')
                toggleTopPanel('monitoringWizard')
              }}>Open Panel</button>
            </div>
          </div>
        </PanelShell>
      )}
    </>
  )
}

export default TopPanels