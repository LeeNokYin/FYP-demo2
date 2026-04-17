import './Hk3DMapControls.css'

function Hk3DMapControls({ isActive, onToggleMap }) {
  return (
    <div className="hk3d-controls" role="group" aria-label="Hong Kong 3D map controls">
      <button
        className={`layer-button ${isActive ? 'active' : 'inactive'}`}
        onClick={onToggleMap}
        title="Hong Kong 3D Map"
        aria-label="Toggle Hong Kong 3D map"
        aria-pressed={isActive}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 9h-4v4h4v-4zm5-8v4h-4V4h4zm-9 0v4H5V4h5zm0 9v4H5v-4h5zm9 4h-4v-4h4v4z"/>
        </svg>
      </button>
    </div>
  )
}

export default Hk3DMapControls
