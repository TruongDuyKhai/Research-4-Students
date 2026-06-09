const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your_access_secret_here';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your_refresh_secret_here';

// Helper to generate access token (15 minutes)
function generateAccessToken(user) {
  const payload = { id: user.id, username: user.username, role: user.role };
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

// Helper to generate refresh token (7 days)
function generateRefreshToken(user) {
  const payload = { id: user.id, username: user.username, role: user.role };
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

// Cookie options for HTTP-only refresh token
const cookieOptions = {
  httpOnly: true,
  secure: false, // Set to true if running in HTTPS
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
};

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { full_name, username, email, password, role, major } = req.body;

  // Validate inputs
  if (!full_name || full_name.trim() === '') {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required.' });
  }
  if (!email || email.trim() === '') {
    return res.status(400).json({ error: 'Email is required.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password is required and must be at least 6 characters long.' });
  }
  if (!role || !['student', 'teacher'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'student' or 'teacher'." });
  }

  try {
    // Validate uniqueness of username and email
    const usernameExists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (usernameExists) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    const emailExists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (emailExists) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    // If role is teacher: set status = pending, do not issue tokens
    if (role === 'teacher') {
      db.prepare(`
        INSERT INTO users (full_name, username, email, password, role, status, avatar, major)
        VALUES (?, ?, ?, ?, 'teacher', 'pending', '/uploads/avatar_default.png', ?)
      `).run(full_name, username, email, passwordHash, major || '');

      return res.status(201).json({ message: 'Awaiting admin approval' });
    }

    // If role is student: check site_settings max_accounts
    const maxAccountsSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'max_accounts'").get();
    const maxAccounts = maxAccountsSetting ? parseInt(maxAccountsSetting.value) : 0;

    if (maxAccounts !== 0) {
      const activeUsersCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get().count;
      if (activeUsersCount >= maxAccounts) {
        return res.status(403).json({ error: 'Registration is currently closed' });
      }
    }

    // Insert student (defaults status = active)
    const result = db.prepare(`
      INSERT INTO users (full_name, username, email, password, role, status, avatar, major)
      VALUES (?, ?, ?, ?, 'student', 'active', '/uploads/avatar_default.png', ?)
    `).run(full_name, username, email, passwordHash, major || '');

    const user = db.prepare('SELECT id, full_name, username, email, role, status, avatar, major FROM users WHERE id = ?').get(result.lastInsertRowid);
    
    // Issue access + refresh tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.status(201).json({ user, accessToken });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Check account status
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Account awaiting admin approval' });
    }
    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Account has been banned' });
    }

    // Block admin accounts from logging in via the regular login page
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts must log in via the admin panel.' });
    }

    // Verify password
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Remove password before returning
    delete user.password;

    // Issue tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.json({ user, accessToken });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const token = req.cookies ? req.cookies.refreshToken : null;

  if (!token) {
    return res.status(401).json({ error: 'Refresh token is missing. Please log in.' });
  }

  jwt.verify(token, REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired refresh token.' });
    }

    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
      if (!user) {
        return res.status(403).json({ error: 'User not found.' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ error: 'User account is not active.' });
      }

      const accessToken = generateAccessToken(user);
      res.json({ accessToken });
    } catch (dbErr) {
      console.error('Token refresh db error:', dbErr);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/'
  });
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, full_name, username, email, role, status, avatar, major, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    console.error('Fetch me database error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
