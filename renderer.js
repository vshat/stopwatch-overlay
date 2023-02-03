function secondsToHhMmSs(seconds) {
    var date = new Date(null);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
}

let startDate = new Date()
const timeNode = document.getElementById('time')
const titleNode = document.getElementById('task')
const exitButton = document.getElementById('exit-btn')
const stopButton = document.getElementById('c-stop-btn')
const startButton = document.getElementById('c-start-btn')

exitButton.onclick = () => window.close()
stopButton.onclick = () => electronAPI.sendMessage('c-stop')
startButton.onclick = () => electronAPI.sendMessage('c-start')


function loop() {
    if (startDate === null) {
        timeNode.textContent = secondsToHhMmSs(0)
        return
    }
    const now = new Date()
    const diffMsec = now - startDate
    const diffSec = Math.round(diffMsec / 1000)
    timeNode.textContent = secondsToHhMmSs(diffSec)
}

setInterval(loop, 50)
loop();

electronAPI.handleMessage((msg) => {
    if (msg.type === 'modeChanged') {
        setWinEditMode(msg.isWinEditMode)
    } else if (msg.type === 'taskUpdate') {
        updateTask(msg)
    }
})

electronAPI.sendMessage('ipc-ready')

function setWinEditMode(isWinEditMode) {
    if (isWinEditMode) {
        document.body.classList.add('editing')
    } else {
        document.body.classList.remove('editing')
    }
}

function updateTask(task) {
    titleNode.textContent = task.title
    startDate = new Date(task.startDate)

    if (task.isRunning) {
        document.body.classList.add('task-running')
    } else {
        document.body.classList.remove('task-running')
    }

    stopButton.style.display = task.isRunning ? "" : "none"
    startButton.style.display = !task.isRunning ? "" : "none"
}
