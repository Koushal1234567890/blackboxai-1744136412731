const { ipcMain } = require('electron');
const { db } = require('../database/db');

class Pomodoro {
    constructor() {
        this.timer = null;
        this.isRunning = false;
        this.currentSession = null;
        this.workDuration = 25 * 60; // 25 minutes in seconds
        this.shortBreakDuration = 5 * 60; // 5 minutes in seconds
        this.longBreakDuration = 15 * 60; // 15 minutes in seconds
        this.sessionsCompleted = 0;
        this.totalSessions = 4;

        this.setupIPC();
    }

    setupIPC() {
        ipcMain.on('start-timer', (event, duration) => {
            this.startTimer(duration || this.workDuration);
        });

        ipcMain.on('pause-timer', () => {
            this.pauseTimer();
        });

        ipcMain.on('reset-timer', () => {
            this.resetTimer();
        });
    }

    startTimer(duration) {
        if (this.isRunning) return;

        this.isRunning = true;
        this.currentSession = {
            startTime: new Date(),
            type: duration === this.workDuration ? 'work' : 'break',
            duration
        };

        let remaining = duration;
        this.timer = setInterval(() => {
            remaining--;
            
            // Send update to all windows
            const windows = BrowserWindow.getAllWindows();
            windows.forEach(window => {
                window.webContents.send('timer-update', {
                    remaining,
                    sessionType: this.currentSession.type
                });
            });

            if (remaining <= 0) {
                this.handleTimerComplete();
            }
        }, 1000);
    }

    pauseTimer() {
        if (!this.isRunning) return;
        
        clearInterval(this.timer);
        this.isRunning = false;
        
        // Update session record with pause time
        if (this.currentSession) {
            this.currentSession.pauseTime = new Date();
        }
    }

    resetTimer() {
        clearInterval(this.timer);
        this.isRunning = false;
        this.currentSession = null;
        
        // Send reset to all windows
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
            window.webContents.send('timer-reset');
        });
    }

    handleTimerComplete() {
        clearInterval(this.timer);
        this.isRunning = false;
        
        if (this.currentSession.type === 'work') {
            this.sessionsCompleted++;
            
            // Save session to database
            db.run(
                `INSERT INTO study_sessions 
                (user_id, start_time, end_time, pomodoro_count) 
                VALUES (?, ?, ?, ?)`,
                [1, this.currentSession.startTime, new Date(), this.sessionsCompleted],
                (err) => {
                    if (err) console.error('Error saving session:', err);
                }
            );

            // Determine next session type
            let nextDuration;
            if (this.sessionsCompleted % this.totalSessions === 0) {
                nextDuration = this.longBreakDuration;
            } else {
                nextDuration = this.shortBreakDuration;
            }

            // Start break automatically
            setTimeout(() => {
                this.startTimer(nextDuration);
            }, 1000);
        } else {
            // Break completed, start work session
            setTimeout(() => {
                this.startTimer(this.workDuration);
            }, 1000);
        }
    }
}

module.exports = new Pomodoro();