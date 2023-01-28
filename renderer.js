function secondsToHhMmSs(seconds) {
    var date = new Date(null);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
}

let startDate = new Date()
const timeNode = document.getElementById('time')
const titleNode = document.getElementById('task')

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
    } else if (msg.type === 'titleChanged') {
        setTitle(msg.title)
    } else if (msg.type === 'startDateChanged') {
        setStartDate(msg.startDate)
    }
})

function setWinEditMode(isWinEditMode) {
    if (isWinEditMode) {
        document.body.classList.add('editing')
    } else {
        document.body.classList.remove('editing')
    }
}

function setTitle(title) {
    titleNode.textContent = title
}

function setStartDate(date) {
    if (date === null) {
        startDate = null
        return
    }
    startDate = new Date(date)
}
