document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('gate2050_token');
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }

    // Verify token with backend
    window.electronAPI.verifyToken(token)
        .catch(() => {
            localStorage.removeItem('gate2050_token');
            window.location.href = 'Login.html';
        });

    // DOM Elements
    const startPomodoroBtn = document.getElementById('start-pomodoro');
    const openCalendarBtn = document.getElementById('open-calendar');
    const subjectTrackerBtn = document.getElementById('subject-tracker');
    const mockTestBtn = document.getElementById('mock-test');
    const errorLogBtn = document.getElementById('error-log');

    // Event Listeners
    startPomodoroBtn.addEventListener('click', () => {
        window.electronAPI.startPomodoroSession();
    });

    openCalendarBtn.addEventListener('click', () => {
        // Will implement calendar functionality later
        alert('Calendar feature coming soon!');
    });

    subjectTrackerBtn.addEventListener('click', () => {
        // Will implement subject tracker functionality later
        alert('Subject Tracker feature coming soon!');
    });

    mockTestBtn.addEventListener('click', () => {
        // Will implement mock test functionality later
        alert('Mock Test feature coming soon!');
    });

    errorLogBtn.addEventListener('click', () => {
        // Will implement error log functionality later
        alert('Error Log feature coming soon!');
    });

    // Load user data
    window.electronAPI.getUserData()
        .then(userData => {
            console.log('User data loaded:', userData);
            // Update UI with user data
        })
        .catch(error => {
            console.error('Failed to load user data:', error);
        });
});