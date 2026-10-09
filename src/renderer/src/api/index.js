// In Electron, window.api is injected by the preload script.
// In a plain browser (web build), we use our own implementation.
import { webApi } from './web.js'

const api = (typeof window !== 'undefined' && window.api) ? window.api : webApi
export default api
