const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electronAPI', {
        // Pomodoro timer controls
        startTimer: (duration) => ipcRenderer.send('start-timer', duration),
        pauseTimer: () => ipcRenderer.send('pause-timer'),
        resetTimer: () => ipcRenderer.send('reset-timer'),
        onTimerUpdate: (callback) => ipcRenderer.on('timer-update', callback),
        onTimerReset: (callback) => ipcRenderer.on('timer-reset', callback),

        // Focus lock controls
        enableFocusLock: (pin) => ipcRenderer.invoke('enable-focus-lock', pin),
        disableFocusLock: (pin) => ipcRenderer.invoke('disable-focus-lock', pin),

        // App blocking functionality
        blockApplications: (appsList) => ipcRenderer.send('block-apps', appsList),
        unblockApplications: () => ipcRenderer.send('unblock-apps'),

        // Database operations
        getUserData: () => ipcRenderer.invoke('get-user-data'),
        updateUserData: (data) => ipcRenderer.invoke('update-user-data', data),

        // Window controls
        minimizeWindow: () => ipcRenderer.send('minimize-window'),
        maximizeWindow: () => ipcRenderer.send('maximize-window'),
        closeWindow: () => ipcRenderer.send('close-window')
    }
);
