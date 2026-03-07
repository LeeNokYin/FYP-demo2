const GEODETIC_TRANSFORM_API_BASE_URL = 'https://www.geodetic.gov.hk/transform/v2/'

const GRID_SYSTEMS = new Set(['hkgrid'])
const GEOGRAPHICAL_SYSTEMS = new Set(['wgsgeog'])

const buildTransformParams = ({ inSys, outSys, e, n, lat, long, zone }) => {
  const normalizedInSys = String(inSys || '').toLowerCase()
  const normalizedOutSys = String(outSys || '').toLowerCase()

  if (!normalizedInSys || !normalizedOutSys) {
    throw new Error('inSys and outSys are required')
  }

  const params = new URLSearchParams({
    inSys: normalizedInSys,
    outSys: normalizedOutSys
  })

  if (GRID_SYSTEMS.has(normalizedInSys)) {
    if (!Number.isFinite(e) || !Number.isFinite(n)) {
      throw new Error('Grid coordinate input requires numeric e and n')
    }
    params.set('e', String(e))
    params.set('n', String(n))
    return params
  }

  if (GEOGRAPHICAL_SYSTEMS.has(normalizedInSys)) {
    if (!Number.isFinite(lat) || !Number.isFinite(long)) {
      throw new Error('Geographical coordinate input requires numeric lat and long')
    }
    params.set('lat', String(lat))
    params.set('long', String(long))
    return params
  }

  if (!Number.isFinite(zone) || !Number.isFinite(e) || !Number.isFinite(n)) {
    throw new Error('UTM input requires numeric zone, e, and n')
  }

  params.set('zone', String(zone))
  params.set('e', String(e))
  params.set('n', String(n))
  return params
}

export const transformCoordinates = async (payload) => {
  const params = buildTransformParams(payload)
  const url = `${GEODETIC_TRANSFORM_API_BASE_URL}?${params.toString()}`

  const response = await fetch(url, { method: 'GET' })
  if (!response.ok) {
    throw new Error(`Geodetic transform API request failed (${response.status})`)
  }

  return response.json()
}

export const transformHK1980ToWGS84 = async (e, n) => {
  return transformCoordinates({
    inSys: 'hkgrid',
    outSys: 'wgsgeog',
    e,
    n
  })
}

export const transformWGS84ToHK1980 = async (lat, long) => {
  return transformCoordinates({
    inSys: 'wgsgeog',
    outSys: 'hkgrid',
    lat,
    long
  })
}

export default {
  transformCoordinates,
  transformHK1980ToWGS84,
  transformWGS84ToHK1980
}