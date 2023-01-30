const { app, BrowserWindow, globalShortcut } = require('electron')

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

let noTasksSinceDate = new Date()
let isTaskRunning = false
let win;
let isWinEditMode = false;
let settings = {}
loadSettings()

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

clockify.init(process.env.CLOCKIFY_API_KEY).then(() => {
    updateTitle()
    setInterval(updateTitle, 1500)
})

const WIDTH = 200;
const HEIGHT = 100;

const createWindow = () => {
    win = new BrowserWindow({
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        width: WIDTH,
        height: HEIGHT,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.setPosition(settings.winPos[0], settings.winPos[1])
    win.loadFile('index.html')
    applyEditMode()
}

app.whenReady().then(() => {
    createWindow()

    globalShortcut.register('Alt+,', () => {
        toggleWindow()
    })
    globalShortcut.register('Alt+.', () => {
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
    globalShortcut.register('Alt+/', () => {
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
            winPos: [0, 0]
        }
    }
}

function saveSettings() {
    fs.writeFileSync(settingsFile, JSON.stringify(settings, undefined, 4))
    console.log('saved settings')
}

function saveWindowPos() {
    newPos = win.getPosition()
    if (settings.winPos[0] === newPos[0] && settings.winPos[1] === newPos[1]) {
        return // no changes
    }

    settings.winPos = newPos
    saveSettings()
}

setInterval(saveWindowPos, 1000)

function updateTitle() {
    clockify.getActiveTimeEntries().then(res => {
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