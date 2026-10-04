import { contextBridge, ipcRenderer } from 'electron'
import { type Api, IPC } from '../shared/api'

const api: Api = {
  getStatus: () => ipcRenderer.invoke(IPC.getStatus)
}

contextBridge.exposeInMainWorld('api', api)
