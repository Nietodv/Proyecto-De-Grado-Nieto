import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { IPC } from '../shared/api'
import { type OpenDatabase, openDatabase } from './db/client'
import { getStatus } from './status'

const isDev = !app.isPackaged

// In development the database lives inside the project so real data is never touched.
function databasePath(): string {
  if (process.env['MANUELITA_DB_PATH']) return process.env['MANUELITA_DB_PATH']
  return isDev
    ? join(app.getAppPath(), '.data', 'dev.db')
    : join(app.getPath('userData'), 'manuelita-saenz.db')
}

function migrationsFolder(): string {
  return isDev ? join(app.getAppPath(), 'drizzle') : join(process.resourcesPath, 'drizzle')
}

let database: OpenDatabase | undefined

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'Manuelita Sáenz',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  window.on('ready-to-show', () => window.show())

  // The app works offline and never navigates away; external links open in the browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Development aid: save a screenshot of the first render and quit.
  const screenshotPath = process.env['MANUELITA_SCREENSHOT']
  if (isDev && screenshotPath) {
    window.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const image = await window.webContents.capturePage()
        writeFileSync(screenshotPath, image.toPNG())
        app.quit()
      }, 1500)
    })
  }
}

if (!app.requestSingleInstanceLock()) {
  // A second copy would open the same SQLite file; keep a single instance.
  app.quit()
} else {
  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows()
    if (!window) return
    if (window.isMinimized()) window.restore()
    window.focus()
  })

  void app.whenReady().then(() => {
    const path = databasePath()
    try {
      mkdirSync(dirname(path), { recursive: true })
      database = openDatabase(path, migrationsFolder())
    } catch (error) {
      dialog.showErrorBox(
        'No se pudo abrir la base de datos',
        `${path}\n\n${error instanceof Error ? error.message : String(error)}`
      )
      app.exit(1)
      return
    }
    console.log(`Database ready at ${path}`)

    ipcMain.handle(IPC.getStatus, () => getStatus(database!, path))

    createWindow()
  })

  app.on('window-all-closed', () => app.quit())
  app.on('will-quit', () => database?.sqlite.close())
}
