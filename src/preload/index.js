import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Libraries
  listLibraries: () => ipcRenderer.invoke('library:list'),
  addLibrary: (lib) => ipcRenderer.invoke('library:add', lib),
  deleteLibrary: (id) => ipcRenderer.invoke('library:delete', id),
  refreshLibrary: (id) => ipcRenderer.invoke('library:refresh', id),

  // Content
  getContent: (filters) => ipcRenderer.invoke('content:get', filters),
  getGroups: (type) => ipcRenderer.invoke('content:groups', type),

  // Series
  getSeriesInfo: (opts) => ipcRenderer.invoke('series:info', opts),

  // Watch progress
  getProgress: (id) => ipcRenderer.invoke('progress:get', id),
  setProgress: (id, pos, dur) => ipcRenderer.invoke('progress:set', id, pos, dur),
  getAllProgress: () => ipcRenderer.invoke('progress:all'),

  // Auth
  testXtreamAuth: (host, user, pass) => ipcRenderer.invoke('xtream:auth', host, user, pass),

  // Store
  storeGet: (key) => ipcRenderer.invoke('store:get', key),
  storeSet: (key, val) => ipcRenderer.invoke('store:set', key, val)
})
