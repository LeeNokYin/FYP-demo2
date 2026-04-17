import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage'
import MapPage from './pages/MapPage'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/map" element={<MapPage />} />
      </Routes>
    </Router>
  )
}

export default App
