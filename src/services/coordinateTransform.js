import proj4 from 'proj4'

const EPSG_WGS84 = 'EPSG:4326'
const EPSG_HK1980_GRID = 'EPSG:2326'

// Hong Kong 1980 Grid System definition (EPSG:2326)
const HK1980_PROJ4_DEFINITION = '+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,-1.5366,-1.1932,-1.3147,-1.0236 +units=m +no_defs +type=crs'

if (!proj4.defs(EPSG_HK1980_GRID)) {
  proj4.defs(EPSG_HK1980_GRID, HK1980_PROJ4_DEFINITION)
}

const assertFinite = (value, name) => {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`)
  }
}

export const transformWGS84ToHK1980 = (lat, long) => {
  assertFinite(lat, 'lat')
  assertFinite(long, 'long')

  const [hkE, hkN] = proj4(EPSG_WGS84, EPSG_HK1980_GRID, [long, lat])
  return { hkE, hkN }
}

export const transformHK1980ToWGS84 = (e, n) => {
  assertFinite(e, 'e')
  assertFinite(n, 'n')

  const [wgsLong, wgsLat] = proj4(EPSG_HK1980_GRID, EPSG_WGS84, [e, n])
  return { wgsLat, wgsLong }
}

export default {
  transformWGS84ToHK1980,
  transformHK1980ToWGS84
}
