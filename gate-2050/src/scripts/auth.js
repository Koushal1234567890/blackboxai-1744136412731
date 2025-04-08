const bcrypt = require('bcrypt-nodejs');
const SALT_ROUNDS = 10;

// Password validation regex
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Input sanitization function
function sanitizeInput(input) {
  return input.toString().replace(/</g, "<").replace(/>/g, ">");
}

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const googleLoginBtn = document.getElementById('google-login');

    // Toggle between login and register forms
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // Handle login
    loginBtn.addEventListener('click', async () => {
        const email = sanitizeInput(document.getElementById('email').value);
        const password = document.getElementById('password').value;

        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }

        if (!PASSWORD_REGEX.test(password)) {
            alert('Password must contain at least 8 characters, including uppercase, lowercase, number and special character');
            return;
        }

        try {
            const response = await window.electronAPI.loginUser(email, password);
            localStorage.setItem('gate2050_token', response.token);
            window.location.href = 'Dashboard.html';
        } catch (error) {
            alert(error.message);
            console.error('Login error:', error);
        }
    });

    // Handle registration
    registerBtn.addEventListener('click', async () => {
        const userData = {
            name: sanitizeInput(document.getElementById('name').value),
            email: sanitizeInput(document.getElementById('reg-email').value),
            password: bcrypt.hashSync(document.getElementById('reg-password').value, bcrypt.genSaltSync(SALT_ROUNDS)),
            college: document.getElementById('college').value,
            gate_year: document.getElementById('gate-year').value,
            prep_level: document.getElementById('prep-level').value
        };

        if (!userData.name || !userData.email || !userData.password) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            await window.electronAPI.registerUser(userData);
            alert('Registration successful! Please login.');
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        } catch (error) {
            alert(error.message);
            console.error('Registration error:', error);
        }
    });

    // Handle Google login
    googleLoginBtn.addEventListener('click', async () => {
        try {
            const response = await window.electronAPI.googleLogin();
            if (response && response.token) {
                localStorage.setItem('gate2050_token', response.token);
                window.location.href = 'Dashboard.html';
            }
        } catch (error) {
            alert('Google login failed');
            console.error('Google login error:', error);
        }
    });
});