const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Auth = require('./components/Auth');
const Pomodoro = require('./components/Pomodoro');
const rateLimit = require('express-rate-limit');

// Initialize components
const auth = new Auth();
const pomodoro = new Pomodoro();

// Apply rate limiting to auth endpoints
const authLimiter = auth.getRateLimiter();

let mainWindow;
let isFocusLockActive = false;
let focusLockPin = '';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    title: 'GATE 2050: Focus Engine for ECE Warriors'
  });

  mainWindow.loadFile('pages/Login.html');

  // Initialize Focus Lock features
  mainWindow.on('focus', () => {
    if (isFocusLockActive) {
      mainWindow.setFullScreen(true);
      mainWindow.setAlwaysOnTop(true);
    }
  });

  // Handle window close attempts during focus lock
  mainWindow.on('close', (e) => {
    if (isFocusLockActive) {
      e.preventDefault();
      const inputPin = prompt('Enter your Focus Lock PIN to exit:');
      if (inputPin === focusLockPin) {
        isFocusLockActive = false;
        mainWindow.close();
      } else {
        alert('Incorrect PIN! Session must complete before exiting.');
      }
    }
  });
}

// Rate limited IPC handlers
ipcMain.handle('login', authLimiter, async (event, credentials) => {
    try {
        const result = await auth.loginUser(credentials.email, credentials.password);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('register', authLimiter, async (event, userData) => {
    try {
        const result = await auth.registerUser(userData);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Other IPC Handlers
ipcMain.handle('enable-focus-lock', (event, pin) => {
  isFocusLockActive = true;
  focusLockPin = pin;
  mainWindow.setFullScreen(true);
  mainWindow.setAlwaysOnTop(true);
  return true;
});

ipcMain.handle('disable-focus-lock', (event, pin) => {
  if (pin === focusLockPin) {
    isFocusLockActive = false;
    mainWindow.setFullScreen(false);
    mainWindow.setAlwaysOnTop(false);
    return true;
  }
  return false;
});

ipcMain.on('block-apps', (event, appsList) => {
  // Implement app blocking logic here
  console.log('Blocking apps:', appsList);
});

ipcMain.on('unblock-apps', () => {
  // Implement app unblocking logic here
  console.log('Unblocking all apps');
});

// Time Block Handlers
ipcMain.handle('get-time-blocks', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM time_blocks WHERE user_id = ?', [1], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-time-block', async (event, block) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO time_blocks 
      (user_id, day, start_time, end_time, activity) 
      VALUES (?, ?, ?, ?, ?)`,
      [1, block.day, block.startTime, block.endTime, block.activity],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...block });
      }
    );
  });
});

ipcMain.handle('update-time-block', async (event, block) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE time_blocks SET 
      day = ?, start_time = ?, end_time = ?, activity = ?
      WHERE id = ? AND user_id = ?`,
      [block.day, block.startTime, block.endTime, block.activity, block.id, 1],
      function(err) {
        if (err) reject(err);
        else resolve(block);
      }
    );
  });
});

ipcMain.handle('delete-time-block', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM time_blocks WHERE id = ? AND user_id = ?',
      [id, 1],
      function(err) {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
});

ipcMain.handle('lock-time-block', async (event, id, pin) => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE time_blocks SET is_locked = ?, supervisor_pin = ? WHERE id = ? AND user_id = ?',
      [true, pin, id, 1],
      function(err) {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
