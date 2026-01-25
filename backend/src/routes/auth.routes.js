const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Email and password are required',
        });
    }

    // Find user by email
    const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );

    const user = result.rows[0];

    if (!user) {
        return res.status(401).json({
            error: 'Authentication Failed',
            message: 'Invalid email or password',
        });
    }

    // Check if user is active
    if (user.status !== 'active') {
        return res.status(401).json({
            error: 'Authentication Failed',
            message: 'Account is inactive',
        });
    }

    // Verify password (support both bcrypt and simple hash)
    let isPasswordValid = false;

    if (user.password_hash.startsWith('$2')) {
        // bcrypt hash
        isPasswordValid = await bcrypt.compare(password, user.password_hash);
    } else if (user.password_hash.startsWith('hash_')) {
        // Simple hash (for migration compatibility)
        const simpleHash = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return `hash_${Math.abs(hash)}`;
        };
        isPasswordValid = user.password_hash === simpleHash(password);
    }

    if (!isPasswordValid) {
        return res.status(401).json({
            error: 'Authentication Failed',
            message: 'Invalid email or password',
        });
    }

    // Update last login
    await query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role_id,
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role_id,
        },
    });
}));

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No token provided',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const result = await query(
            'SELECT id, email, name, role_id, status FROM users WHERE id = $1',
            [decoded.id]
        );

        const user = result.rows[0];

        if (!user || user.status !== 'active') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not found or inactive',
            });
        }

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role_id,
        });
    } catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid token',
        });
    }
}));

/**
 * POST /api/auth/logout
 * Logout (client-side token removal)
 */
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
