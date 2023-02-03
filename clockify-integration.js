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

/**
 * 
 * @param {string} start - iso8601 datetime
 * @param {string} description 
 * @param {string} projectId 
 */
async function createTimeEntry(start, description, projectId) {
    const data = {
        start,
        description,
        projectId
    }

    const url = `https://api.clockify.me/api/v1/workspaces/${_selectedWorkspace.id}/time-entries`
    const res = await axios.post(url, data, {
        headers: {
            'x-api-key': _apiKey
        }
    })

    return res.data
}

/**
 * 
 * @param {string} end - iso8601 datetime
 */
async function stopActiveTimeEntry(end) {
    const data = {
        end
    }

    const url = `https://api.clockify.me/api/v1/workspaces/${_selectedWorkspace.id}/user/${_user.id}/time-entries`
    const res = await axios.patch(url, data, {
        headers: {
            'x-api-key': _apiKey
        }
    })

    return res.data
}
module.exports = {
    getUserInfo,
    init,
    getWorkspaces,
    getActiveTimeEntries,
    getActiveTimeEntryDate,
    createTimeEntry,
    stopActiveTimeEntry
}