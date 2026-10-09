import Store from 'electron-store'

const store = new Store({
  defaults: {
    libraries: [],
    content: {},
    watchProgress: {},
    settings: {
      downloadPath: ''
    }
  }
})

export default store
