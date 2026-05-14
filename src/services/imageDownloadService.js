/**
 * Image Download Service
 * Handles downloading CCTV images from the API with CORS proxy support
 */

/**
 * Rewrite image URL for dev mode CORS proxy
 * In dev mode, rewrite eaplanner URLs to use the proxy
 */
const getProxiedUrl = (url) => {
  if (import.meta.env.DEV && url.includes('eaplanner.odensystems.hk')) {
    const originalUrl = new URL(url)
    const queryString = originalUrl.search
    return `/proxy/eaplanner-image${queryString}`
  }
  return url
}

/**
 * Download a single image file
 * @param {string} imageUrl - Full image URL from CCTV API
 * @param {string} filename - Optional filename (default: generated from timestamp)
 */
export const downloadImage = async (imageUrl, filename = null) => {
  try {
    const proxiedUrl = getProxiedUrl(imageUrl)
    const response = await fetch(proxiedUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `image-${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return true
  } catch (error) {
    console.error('Image download failed:', error)
    throw error
  }
}

/**
 * Download multiple images as a zip file
 * @param {Array} images - Array of image objects with {url, fileTime}
 * @returns {Promise<void>}
 * Note: Requires a zip library like JSZip
 */
export const downloadImagesAsZip = async (images) => {
  try {
    // Dynamic import JSZip (you'll need to install it first: npm install jszip)
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    
    for (const image of images) {
      const proxiedUrl = getProxiedUrl(image.url)
      const response = await fetch(proxiedUrl)
      
      if (!response.ok) {
        console.warn(`Failed to fetch: ${image.url}`)
        continue
      }
      
      const blob = await response.blob()
      const filename = image.fileTime 
        ? `${image.fileTime.replace(/[\s:]/g, '-')}.jpg`
        : `image-${Date.now()}.jpg`
      
      zip.file(filename, blob)
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cctv-images-${Date.now()}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return true
  } catch (error) {
    console.error('Zip download failed:', error)
    throw error
  }
}

/**
 * Get image as Base64 string
 * Useful for sending to APIs or storing
 * @param {string} imageUrl - Full image URL
 * @returns {Promise<string>} Base64 encoded image string
 */
export const getImageAsBase64 = async (imageUrl) => {
  try {
    const proxiedUrl = getProxiedUrl(imageUrl)
    const response = await fetch(proxiedUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Base64 conversion failed:', error)
    throw error
  }
}

/**
 * Get image as Blob
 * @param {string} imageUrl - Full image URL
 * @returns {Promise<Blob>} Image blob
 */
export const getImageAsBlob = async (imageUrl) => {
  try {
    const proxiedUrl = getProxiedUrl(imageUrl)
    const response = await fetch(proxiedUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    return await response.blob()
  } catch (error) {
    console.error('Blob conversion failed:', error)
    throw error
  }
}

/**
 * Batch download images with progress callback
 * @param {Array} images - Array of image objects
 * @param {Function} onProgress - Callback (current, total)
 * @returns {Promise<void>}
 */
export const batchDownloadImages = async (images, onProgress = null) => {
  try {
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      const filename = image.fileTime
        ? `${image.fileTime.replace(/[\s:]/g, '-')}.jpg`
        : `image-${i}-${Date.now()}.jpg`
      
      await downloadImage(image.url, filename)
      
      if (onProgress) {
        onProgress(i + 1, images.length)
      }
      
      // Add small delay between downloads to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  } catch (error) {
    console.error('Batch download failed:', error)
    throw error
  }
}
