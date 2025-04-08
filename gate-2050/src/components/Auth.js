const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per window
    message: 'Too many attempts, please try again later'
});

class Auth {
    constructor() {
        this.SALT_ROUNDS = 12; // Increased for better security
        this.JWT_SECRET = process.env.JWT_SECRET;
        if (!this.JWT_SECRET) {
            throw new Error('JWT_SECRET must be set in environment variables');
        }
        this.JWT_EXPIRES_IN = '15m'; // Shorter access token lifetime
        this.REFRESH_EXPIRES_IN = '7d';
        this.tokenBlacklist = new Set();
    }

    async registerUser(userData) {
        try {
            // Check if user already exists
            const existingUser = await db.get(
                'SELECT * FROM users WHERE email = ?', 
                [userData.email]
            );
            
            if (existingUser) {
                throw new Error('Email already registered');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(
                userData.password, 
                this.SALT_ROUNDS
            );

            // Insert new user
            const result = await db.run(
                `INSERT INTO users (
                    name, 
                    email, 
                    password, 
                    college, 
                    gate_year, 
                    prep_level
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    userData.name,
                    userData.email,
                    hashedPassword,
                    userData.college,
                    userData.gate_year,
                    userData.prep_level
                ]
            );

            return { id: result.lastID, ...userData };
        } catch (error) {
            throw error;
        }
    }

    // Apply rate limiting middleware
    getRateLimiter() {
        return authLimiter;
    }

    async loginUser(email, password) {
        try {
            // Find user
            const user = await db.get(
                'SELECT * FROM users WHERE email = ?', 
                [email]
            );
            
            if (!user) {
                throw new Error('User not found');
            }

            // Verify password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                throw new Error('Invalid credentials');
            }

            // Generate JWT token
            // Generate access and refresh tokens
            const accessToken = jwt.sign(
                { id: user.id, email: user.email },
                this.JWT_SECRET,
                { expiresIn: this.JWT_EXPIRES_IN }
            );
            
            const refreshToken = jwt.sign(
                { id: user.id },
                this.JWT_SECRET + user.password, // Refresh token secret includes password hash
                { expiresIn: this.REFRESH_EXPIRES_IN }
            );

            // Store refresh token in database
            await db.run(
                'UPDATE users SET refresh_token = ? WHERE id = ?',
                [refreshToken, user.id]
            );

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                accessToken,
                refreshToken
            };
        } catch (error) {
            throw error;
        }
    }

    async verifyToken(token) {
        try {
            if (this.tokenBlacklist.has(token)) {
                throw new Error('Token revoked');
            }
            return jwt.verify(token, this.JWT_SECRET);
        } catch (error) {
            throw error;
        }
    }

    async refreshToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, this.JWT_SECRET + user.password);
            
            // Get user from DB
            const user = await db.get(
                'SELECT * FROM users WHERE id = ? AND refresh_token = ?',
                [decoded.id, refreshToken]
            );
            
            if (!user) {
                throw new Error('Invalid refresh token');
            }

            // Generate new access token
            const newAccessToken = jwt.sign(
                { id: user.id, email: user.email },
                this.JWT_SECRET,
                { expiresIn: this.JWT_EXPIRES_IN }
            );

            return {
                accessToken: newAccessToken
            };
        } catch (error) {
            throw error;
        }
    }

    async logout(token) {
        this.tokenBlacklist.add(token);
    }

    async resetPassword(email, newPassword) {
        try {
            // Find user
            const user = await db.get(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            
            if (!user) {
                throw new Error('User not found');
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

            // Update password and invalidate all tokens
            await db.run(
                'UPDATE users SET password = ?, refresh_token = NULL WHERE id = ?',
                [hashedPassword, user.id]
            );

            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new Auth();