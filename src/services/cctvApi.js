// 聲音監測 API 服務
const DEFAULT_API_KEY = 'KWR6JeSgI19T9hMqd1Q8nGcAvZP3umGK'
const DEFAULT_PRODUCTION_API = 'https://eaplanner.odensystems.hk/Api/IVEBird/Voice'
const DEV_API = '/api/IVEBird/Voice'

const getApiConfig = () => {
  const apiKey = import.meta.env.VITE_CCTV_API_KEY || DEFAULT_API_KEY
  const apiUrl = import.meta.env.DEV
    ? DEV_API
    : import.meta.env.VITE_CCTV_API_URL || DEFAULT_PRODUCTION_API

  return { apiKey, apiUrl }
}

/**
 * 查詢聲音資料
 * @param {Object} params - 查詢參數
 * @param {string} params.StartTime - 開始時間（格式：YYYY-MM-DD HH:mm:ss）
 * @param {string} params.EndTime - 結束時間（格式：YYYY-MM-DD HH:mm:ss）
 * @param {number} params.StartIndex - 起始索引
 * @param {number} params.EndIndex - 結束索引
 * @returns {Promise<Object>} API 回應
 */
const normalizeVoice = (voice) => ({
  id: voice?.id ?? voice?.Id ?? voice?.ID ?? null,
  birdName: voice?.birdName ?? voice?.BirdName ?? '',
  birdScore: voice?.birdScore ?? voice?.BirdScore ?? '0%',
  birdCount: Number(voice?.birdCount ?? voice?.BirdCount ?? 0),
  soundUrl: voice?.soundUrl ?? voice?.SoundUrl ?? '',
  recordTime: voice?.recordTime ?? voice?.RecordTime ?? ''
})

const normalizeVoiceResponse = (data) => {
  if (!data || typeof data !== 'object') {
    return { success: false, errorMessage: 'Invalid response', voices: [] }
  }

  const voices = Array.isArray(data.voices)
    ? data.voices
    : Array.isArray(data.Voices)
      ? data.Voices
      : []

  return {
    success: data.success ?? data.Success ?? false,
    errorMessage: data.errorMessage ?? data.ErrorMessage ?? null,
    monitor: data.monitor ?? data.Monitor ?? 'N/A',
    startIndex: data.startIndex ?? data.StartIndex ?? 0,
    endIndex: data.endIndex ?? data.EndIndex ?? 0,
    totalLength: data.totalLength ?? data.TotalLength ?? 0,
    voices: voices.map(normalizeVoice)
  }
}

export const fetchVoiceData = async (params) => {
  try {
    const { apiUrl, apiKey } = getApiConfig()
    console.log(`[CCTV API] Request URL: ${apiUrl}`)
    console.log(`[CCTV API] Environment: ${import.meta.env.DEV ? 'Development (using Vite proxy)' : 'Production'}`)
    console.log(`[CCTV API] Request params:`, params)

    // 建立表單資料（API 看起來預期 application/x-www-form-urlencoded 格式）
    const formData = new URLSearchParams()
    formData.append('StartTime', params.StartTime)
    formData.append('EndTime', params.EndTime)
    formData.append('StartIndex', params.StartIndex)
    formData.append('EndIndex', params.EndIndex)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    const data = await response.json()
    console.log('[CCTV API] Response successful:', data)

    return normalizeVoiceResponse(data)
  } catch (error) {
    if (error instanceof TypeError && /fetch/i.test(error.message)) {
      throw new Error(
        'CORS/network error: In production, this API must be called via a backend/proxy that returns Access-Control-Allow-Origin for your GitHub Pages domain.'
      )
    }
    console.error('[CCTV API] Request failed:', error)
    throw error
  }
}

/**
 * 檢查 API 連線
 * @returns {Promise<boolean>} 連線是否成功
 */
export const testApiConnection = async () => {
  try {
    const testParams = {
      StartTime: new Date(new Date().setDate(new Date().getDate() - 1))
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19),
      EndTime: new Date()
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19),
      StartIndex: 0,
      EndIndex: 1
    }

    const response = await fetchVoiceData(testParams)
    return response.success === true
  } catch (error) {
    console.error('API connection test failed:', error)
    return false
  }
}

export default {
  fetchVoiceData,
  testApiConnection
}
