import { useNavigate } from 'react-router-dom'
import './Welcome.css'

function Welcome() {
  const navigate = useNavigate()

  const handleEnter = () => {
    navigate('/map')
  }

  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <h1>welcome</h1>
        <p>press enter </p>
        <button className="enter-button" onClick={handleEnter}>
          enter
        </button>
      </div>
    </div>
  )
}

export default Welcome
