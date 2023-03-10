const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron')

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    console.log("The app is already running")
    app.quit()
    return
}

require('dotenv').config()
const path = require('path')
const fs = require('fs');
const clockify = require('./clockify-integration')

const settingsFile = path.join(__dirname, 'settings.json')
const CONTAINER_HOVER_DETECTION_GAP = 20

let noTasksSinceDate = new Date()
let isTaskRunning = false
let win;
let settings = {}
loadSettings()
let containerSize = {
    width: 0,
    height: 0
}

let isWinEditMode = settings.isWinEditMode;


app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

if (process.env.CLOCKIFY_ENABLED) {
    clockify.init(process.env.CLOCKIFY_API_KEY).then(() => {
        updateTitle()
        setInterval(updateTitle, 1500)
    })
}
const CLOCKIFY_DEFAULT_PROJECT_ID = process.env.CLOCKIFY_DEFAULT_PROJECT_ID || null

const WIDTH = 200;
const HEIGHT = 100;

const createWindow = () => {
    win = new BrowserWindow({
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        width: WIDTH,
        height: HEIGHT,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.setPosition(settings.winPos[0], settings.winPos[1])
    win.loadFile('index.html')
}

app.whenReady().then(() => {
    createWindow()
    applyEditMode()
    setupMouseTracker()

    globalShortcut.registerAll(['Alt+,', 'Ctrl+Alt+,'], () => {
        toggleWindow()
    })
    globalShortcut.registerAll(['Alt+.', 'Ctrl+Alt+.'], () => {
        if (win.webContents.isDevToolsOpened()) {
            win.setSize(WIDTH, HEIGHT)
            win.webContents.closeDevTools()
            isWinEditMode = false
            applyEditMode()
        } else {
            isWinEditMode = true
            applyEditMode()
            win.setSize(800, 400)
            win.webContents.openDevTools()
        }
    })
    globalShortcut.registerAll(['Alt+/', 'Ctrl+Alt+/'], () => {
        noTasksSinceDate = new Date()
        win.webContents.send('message', {
            'type': 'taskUpdate',
            'startDate': noTasksSinceDate.toISOString(),
            'title': "",
            'isRunning': false
        })
    })

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

ipcMain.on('message', (ev, data) => {
    if (data === 'c-stop') {
        handleClockifyStop()
    } else if (data === 'c-start') {
        handleClockifyStart()
    } else if (data === 'ipc-ready') {
        handleRendererIpcReady()
    } else if (data.type && data.type === 'container-size-changed') {
        containerSize = data.size
    } else {
        console.log('ipcMain: unknown message:', data)
    }
})

function applyEditMode() {
    win.setIgnoreMouseEvents(!isWinEditMode);
    win.setFocusable(isWinEditMode);

    win.webContents.send('message', {
        'type': 'modeChanged',
        'isWinEditMode': isWinEditMode
    })
}

function toggleWindow() {
    isWinEditMode = !isWinEditMode
    applyEditMode()
}

function loadSettings() {
    if (fs.existsSync(settingsFile)) {
        settings = JSON.parse(fs.readFileSync(settingsFile))
    } else {
        settings = {
            winPos: [0, 0],
            isWinEditMode: false
        }
    }
}

function writeSettings() {
    const str = JSON.stringify(settings, undefined, 4)
    fs.writeFileSync(settingsFile, str)
}

function saveWindowPos() {
    if (win.isDestroyed()) return false;

    newPos = win.getPosition()
    if (settings.winPos[0] === newPos[0] && settings.winPos[1] === newPos[1]) {
        return false
    }

    settings.winPos = newPos
    return true
}

function saveWinMode() {
    if (settings.isWinEditMode === isWinEditMode) {
        return false
    }

    settings.isWinEditMode = isWinEditMode
    return true
}

function saveSettings() {
    if (saveWindowPos() || saveWinMode()) {
        writeSettings()
    }
}

setInterval(saveSettings, 1000)

function updateTitle() {
    clockify.getActiveTimeEntries().then(res => {
        if (win.isDestroyed()) return;

        if (!res[0]) {
            if (isTaskRunning) {
                noTasksSinceDate = new Date()
                isTaskRunning = false
            }

            win.webContents.send('message', {
                'type': 'taskUpdate',
                'startDate': noTasksSinceDate.toISOString(),
                'title': 'No running tasks',
                'isRunning': false
            })
            return
        }
        isTaskRunning = true
        const start = res[0].timeInterval.start

        win.webContents.send('message', {
            'type': 'taskUpdate',
            'startDate': start,
            'title': res[0].description,
            'isRunning': true
        })
    }).catch(err => {
        console.log(err)
    })

}

async function handleClockifyStop() {
    console.log('clockify stop')
    if (!isTaskRunning) {
        console.log('There is no clockify task to stop')
    }
    noTasksSinceDate = new Date()
    try {
        const res = await clockify.stopActiveTimeEntry(noTasksSinceDate.toISOString())
        // console.log(res)

        win.webContents.send('message', {
            'type': 'taskUpdate',
            'startDate': noTasksSinceDate.toISOString(),
            'title': "",
            'isRunning': false
        })
    } catch (e) {
        console.log(e)
    }
}

async function handleClockifyStart() {
    console.log('clockify start')
    if (isTaskRunning) {
        console.log('clockify task is already started - doing nothing')
    }

    try {
        const res = await clockify.createTimeEntry(
            noTasksSinceDate.toISOString(), "", CLOCKIFY_DEFAULT_PROJECT_ID)

        // console.log(res)
    } catch (e) { console.log(e) }
}

function handleRendererIpcReady() {
    applyEditMode()
}

function setupMouseTracker() {
    // We cannot require the screen module until the app is ready.
    const { screen } = require('electron')

    let wasHovering = false;
    setInterval(() => {
        if (win.isDestroyed()) {
            return
        }

        // { x: 674, y: 200}
        const cursor = screen.getCursorScreenPoint()

        // { x: 1153, y: 285, width: 202, height: 103 }
        const winBounds = win.webContents.getOwnerBrowserWindow().getBounds()

        const gap = CONTAINER_HOVER_DETECTION_GAP;

        const cursorHoversWindow = cursor.x >= winBounds.x - gap &&
            cursor.x <= winBounds.x + containerSize.width + gap &&
            cursor.y >= winBounds.y - gap &&
            cursor.y <= winBounds.y + containerSize.height + gap

        if (wasHovering != cursorHoversWindow) {
            wasHovering = cursorHoversWindow

            win.webContents.send('message', {
                'type': 'transparencyChanged',
                'transparent': cursorHoversWindow
            })
        }

    }, 50)
}