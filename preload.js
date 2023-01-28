const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    handleMessage: (callback) => ipcRenderer.on('message', (e, msg) => callback(msg)),
    sendMessage: (msg) => ipcRenderer.send('message', msg)
})
