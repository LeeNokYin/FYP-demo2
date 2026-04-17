import { useMemo, useState } from 'react'
import treeDensityOptions from '../../../data/treeDensityOptions.json'
import './CarbonCalculator.css'

const OTHER_OPTION = '__other__'

function parsePositiveNumber(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

function CarbonCalculator({ onClose }) {
  const [woodDensity, setWoodDensity] = useState('')
  const [customWoodDensity, setCustomWoodDensity] = useState('')
  const [dbh, setDbh] = useState('')
  const [customDbh, setCustomDbh] = useState('')
  const [baseDiameter, setBaseDiameter] = useState('')
  const [treeHeight, setTreeHeight] = useState('')
  const [customTreeHeight, setCustomTreeHeight] = useState('')
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const hasResult = useMemo(() => result !== null, [result])
  const dbhOptions = useMemo(
    () => [...new Set(treeDensityOptions.map((tree) => tree.dbh))].sort((a, b) => a - b),
    []
  )
  const heightOptions = useMemo(
    () => [...new Set(treeDensityOptions.map((tree) => tree.treeHeight))].sort((a, b) => a - b),
    []
  )

  const resolveSelectValue = (selectedValue, customValue) => {
    if (selectedValue === OTHER_OPTION) {
      return parsePositiveNumber(customValue)
    }

    return parsePositiveNumber(selectedValue)
  }

  const handleCalculate = (event) => {
    event.preventDefault()

    // 1) 三個下拉欄位都支援 Other，自訂值時改讀對應手動輸入欄位。
    const woodDensityValue = resolveSelectValue(woodDensity, customWoodDensity)
    const dbhValue = resolveSelectValue(dbh, customDbh)
    const baseDiameterValue = parsePositiveNumber(baseDiameter)
    const treeHeightValue = resolveSelectValue(treeHeight, customTreeHeight)

    if (!woodDensityValue || !dbhValue || !baseDiameterValue || !treeHeightValue) {
      setErrorMessage('Please choose valid values for wood density, DBH, base diameter, and tree height. If you select Other, enter a value greater than 0.')
      setResult(null)
      return
    }

    setErrorMessage('')

    // 2) Formula 1 (Allometric empirical model):
    // carbon content = [0.0673 * (Wood density * DBH * DBH * Tree height)^0.976] / 2
    const allometricBase = woodDensityValue * dbhValue * dbhValue * treeHeightValue
    const allometricModel = (0.0673 * Math.pow(allometricBase, 0.976)) / 2

    // 3) Formula 2 (Allometric base diameter geometric model):
    // carbon content = [0.5 * Math.PI * (Base diameter/2)^2 * Tree height * Wood density] / 2
    const radiusFromBaseDiameter = baseDiameterValue / 2
    const baseDiameterModel = (0.5 * Math.PI * Math.pow(radiusFromBaseDiameter, 2) * treeHeightValue * woodDensityValue) / 2

    // 4) Save both model outputs for rendering.
    setResult({
      allometricModel,
      baseDiameterModel
    })
  }

  return (
    <aside className="carbon-calculator-panel" role="dialog" aria-modal="false" aria-label="Tree carbon calculator">
      <div className="carbon-calculator-header">
        <h3>Tree Carbon Calculator</h3>
        <button type="button" className="carbon-calculator-close" onClick={onClose} aria-label="Close carbon calculator">×</button>
      </div>

      <div className="carbon-calculator-body">
        <p className="carbon-calculator-subtitle">Use dropdown presets or choose Other to input your own values.</p>

        <form className="carbon-calculator-form" onSubmit={handleCalculate}>
          <label htmlFor="wood-density">Wood Density (g/cm³)</label>
          <select
            id="wood-density"
            value={woodDensity}
            onChange={(event) => setWoodDensity(event.target.value)}
          >
            <option value="">Select tree species and density</option>
            {treeDensityOptions.map((tree) => (
              <option key={tree.number} value={tree.averageWoodDensityGPerM3}>
                {tree.englishName} ({tree.averageWoodDensityGPerM3} g/cm³ | {tree.averageWoodDensityKgPerM3} kg/m³)
              </option>
            ))}
            <option value={OTHER_OPTION}>Other</option>
          </select>
          {woodDensity === OTHER_OPTION && (
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={customWoodDensity}
              onChange={(event) => setCustomWoodDensity(event.target.value)}
              placeholder="Enter custom wood density"
            />
          )}

          <label htmlFor="dbh">DBH (cm)</label>
          <select
            id="dbh"
            value={dbh}
            onChange={(event) => setDbh(event.target.value)}
          >
            <option value="">Select DBH</option>
            {dbhOptions.map((value) => (
              <option key={`dbh-${value}`} value={value}>{value}</option>
            ))}
            <option value={OTHER_OPTION}>Other</option>
          </select>
          {dbh === OTHER_OPTION && (
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={customDbh}
              onChange={(event) => setCustomDbh(event.target.value)}
              placeholder="Enter custom DBH"
            />
          )}

          <label htmlFor="base-diameter">Base Diameter (cm)</label>
          <input
            id="base-diameter"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={baseDiameter}
            onChange={(event) => setBaseDiameter(event.target.value)}
            placeholder="Enter base diameter"
          />

          <label htmlFor="tree-height">Tree Height (m)</label>
          <select
            id="tree-height"
            value={treeHeight}
            onChange={(event) => setTreeHeight(event.target.value)}
          >
            <option value="">Select tree height</option>
            {heightOptions.map((value) => (
              <option key={`height-${value}`} value={value}>{value}</option>
            ))}
            <option value={OTHER_OPTION}>Other</option>
          </select>
          {treeHeight === OTHER_OPTION && (
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={customTreeHeight}
              onChange={(event) => setCustomTreeHeight(event.target.value)}
              placeholder="Enter custom tree height"
            />
          )}

          <button type="submit" className="carbon-calculate-btn">Calculate</button>
        </form>

        {errorMessage && <div className="carbon-error">{errorMessage}</div>}

        {hasResult && (
          <div className="carbon-result-panel">
            <div className="carbon-result-item">
              <h3>Formula 1: Allometric Model (Empirical)</h3>
              <p>{result.allometricModel.toFixed(4)}</p>
            </div>
            <div className="carbon-result-item">
              <h3>Formula 2: Allometric Model (Base Diameter Geometric)</h3>
              <p>{result.baseDiameterModel.toFixed(4)}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default CarbonCalculator
