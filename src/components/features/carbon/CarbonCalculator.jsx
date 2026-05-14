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

function normalizeTreeOption(tree, index) {
  const woodDensity = parsePositiveNumber(tree['Average wood density (g/m³)'])
  const dbh = parsePositiveNumber(tree['Average DBH'])
  const treeHeight = parsePositiveNumber(tree['Average Tree Height'])

  if (!woodDensity || !dbh || !treeHeight) {
    return null
  }

  return {
    id: `${tree['Tree Name'] ?? 'tree'}-${index}`,
    name: tree['Tree Name'] ?? `Tree ${index + 1}`,
    woodDensity,
    woodDensityKg: parsePositiveNumber(tree['Average wood density (kg/m³)']),
    dbh,
    treeHeight
  }
}

function CarbonCalculator({ onClose }) {
  const [woodDensity, setWoodDensity] = useState('')
  const [customWoodDensity, setCustomWoodDensity] = useState('')
  const [dbh, setDbh] = useState('')
  const [customDbh, setCustomDbh] = useState('')
  const [treeHeight, setTreeHeight] = useState('')
  const [customTreeHeight, setCustomTreeHeight] = useState('')
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const hasResult = useMemo(() => result !== null, [result])
  const presetTreeOptions = useMemo(
    () => treeDensityOptions.map(normalizeTreeOption).filter(Boolean),
    []
  )
  const dbhOptions = useMemo(
    () => [...new Set(presetTreeOptions.map((tree) => tree.dbh))].sort((a, b) => a - b),
    [presetTreeOptions]
  )
  const dbhBoundaryOptions = useMemo(() => {
    if (dbhOptions.length <= 2) {
      return dbhOptions
    }

    return [dbhOptions[0], dbhOptions[dbhOptions.length - 1]]
  }, [dbhOptions])
  const heightOptions = useMemo(
    () => [...new Set(presetTreeOptions.map((tree) => tree.treeHeight))].sort((a, b) => a - b),
    [presetTreeOptions]
  )
  const heightBoundaryOptions = useMemo(() => {
    if (heightOptions.length <= 2) {
      return heightOptions
    }

    return [heightOptions[0], heightOptions[heightOptions.length - 1]]
  }, [heightOptions])

  const selectedPresetTree = useMemo(
    () => presetTreeOptions.find((tree) => tree.id === woodDensity) ?? null,
    [presetTreeOptions, woodDensity]
  )

  const resolveSelectValue = (selectedValue, customValue) => {
    if (selectedValue === OTHER_OPTION) {
      return parsePositiveNumber(customValue)
    }

    return parsePositiveNumber(selectedValue)
  }

  const resolveWoodDensityValue = () => {
    if (woodDensity === OTHER_OPTION) {
      return parsePositiveNumber(customWoodDensity)
    }

    return selectedPresetTree?.woodDensity ?? null
  }

  const handleWoodDensityChange = (event) => {
    const nextValue = event.target.value
    setWoodDensity(nextValue)

    if (nextValue === OTHER_OPTION) {
      return
    }

    const tree = presetTreeOptions.find((item) => item.id === nextValue)
    if (!tree) {
      return
    }

    // Keep DBH/height dropdowns concise while still auto-filling exact matched values.
    setDbh(OTHER_OPTION)
    setCustomDbh(String(tree.dbh))
    setTreeHeight(OTHER_OPTION)
    setCustomTreeHeight(String(tree.treeHeight))
  }

  const handleCalculate = (event) => {
    event.preventDefault()

    const woodDensityValue = resolveWoodDensityValue()
    const dbhValue = resolveSelectValue(dbh, customDbh)
    const treeHeightValue = resolveSelectValue(treeHeight, customTreeHeight)

    if (!woodDensityValue || !dbhValue || !treeHeightValue) {
      setErrorMessage('Please choose valid values for wood density, DBH, and tree height. If you select Other, enter a value greater than 0.')
      setResult(null)
      return
    }

    setErrorMessage('')

    const carbonContent = (0.0673 * Math.pow(woodDensityValue * dbhValue * dbhValue * treeHeightValue, 0.976)) / 2

    setResult({ carbonContent })
  }

  return (
    <aside className="carbon-calculator-panel" role="dialog" aria-modal="false" aria-label="Tree carbon calculator">
      <div className="carbon-calculator-header">
        <h3>Tree Carbon Calculator</h3>
        <button type="button" className="carbon-calculator-close" onClick={onClose} aria-label="Close carbon calculator">×</button>
      </div>

      <div className="carbon-calculator-body">
        <p className="carbon-calculator-subtitle">Use JSON presets or choose Other to input your own values.</p>

        <form className="carbon-calculator-form" onSubmit={handleCalculate}>
          <label htmlFor="wood-density">Wood Density (g/cm³)</label>
          <select
            id="wood-density"
            value={woodDensity}
            onChange={handleWoodDensityChange}
          >
            <option value="">Select wood density</option>
            {presetTreeOptions.map((tree) => (
              <option key={tree.id} value={tree.id}>
                {tree.name} ({tree.woodDensity} g/cm³{tree.woodDensityKg ? ` | ${tree.woodDensityKg} kg/m³` : ''})
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

          <label htmlFor="dbh">Diameter Breast Height (cm)</label>
          <select
            id="dbh"
            value={dbh}
            onChange={(event) => setDbh(event.target.value)}
          >
            <option value="">Select Diameter Breast Height</option>
            {dbhBoundaryOptions.map((value) => (
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

          <label htmlFor="tree-height">Tree Height (m)</label>
          <select
            id="tree-height"
            value={treeHeight}
            onChange={(event) => setTreeHeight(event.target.value)}
          >
            <option value="">Select tree height</option>
            {heightBoundaryOptions.map((value) => (
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
              <h3>Carbon Content</h3>
              <p>{result.carbonContent.toFixed(4)}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default CarbonCalculator
