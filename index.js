require('dotenv').config()
const { app, BrowserWindow, globalShortcut } = require('electron')
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

// process.exit(0)
clockify.init(process.env.CLOCKIFY_API_KEY)

const createWindow = () => {
    win = new BrowserWindow({
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        width: 300,
        height: 100,
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
    console.log('xd')

    globalShortcut.register('Alt+,', () => {
        console.log('hi')
        toggleWindow()
    })

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

function applyEditMode() {
    console.log('isWinEditMode=' + isWinEditMode)

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
        console.log('loaded settings: ')
        console.log(settings)
    } else {
        console.log('loaded default settings')
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
    console.log('new pos: ', newPos)
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
                'type': 'startDateChanged',
                'startDate': noTasksSinceDate.toISOString()
            })

            win.webContents.send('message', {
                'type': 'titleChanged',
                'title': "No running tasks"
            })
            return
        }
        isTaskRunning = true
        const start = res[0].timeInterval.start

        win.webContents.send('message', {
            'type': 'startDateChanged',
            'startDate': start
        })

        win.webContents.send('message', {
            'type': 'titleChanged',
            'title': res[0].description
        })

        console.log(start, res[0].description)
    }).catch(err => {
        console.log(err)
    })

}
setInterval(updateTitle, 1500)