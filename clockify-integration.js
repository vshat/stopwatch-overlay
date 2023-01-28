const axios = require('axios')

let _apiKey = null
let _user = null
let _workspaces = null
let _selectedWorkspace = null
let _activeTimeEntriesUrl = null

async function init(apiKey) {
    _apiKey = apiKey
    _user = await getUserInfo()
    console.log('clockify: init: hello,', _user.name)

    _workspaces = await getWorkspaces()

    console.log('clockify: init: workspaces: ')
    _workspaces.forEach(ws => {
        console.log(ws.id, ws.name)
    });
    if (!_workspaces.length) {
        throw 'clockify: init: no workspaces!'
    }

    console.log('clockify: init: choosing the first workspace')
    _selectedWorkspace = _workspaces[0]
    _activeTimeEntriesUrl = `https://api.clockify.me/api/v1/workspaces/${_selectedWorkspace.id}/user/${_user.id}/time-entries?in-progress=true`
    console.log('active time entries url:', _activeTimeEntriesUrl)
}

async function getUserInfo() {
    const url = "https://api.clockify.me/api/v1/user";

    const res = await axios.get(url, {
        headers: {
            'x-api-key': _apiKey
        }
    })

    return res.data
}

async function getWorkspaces() {
    const url = "https://api.clockify.me/api/v1/workspaces";

    const res = await axios.get(url, {
        headers: {
            'x-api-key': _apiKey
        }
    })

    return res.data
}

async function getActiveTimeEntries() {
    const res = await axios.get(_activeTimeEntriesUrl, {
        headers: {
            'x-api-key': _apiKey
        }
    })

    return res.data
}

async function getActiveTimeEntryDate() {
    const entries = await getActiveTimeEntries()
    if (!entries[0]) return null;
    const start = entries[0].timeInterval.start
    return new Date(start)
}

module.exports = {
    getUserInfo,
    init,
    getWorkspaces,
    getActiveTimeEntries,
    getActiveTimeEntryDate
}