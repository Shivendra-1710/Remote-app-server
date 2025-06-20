const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { models } = require('../config/db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to format user response
const formatUserResponse = (user) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  email: user.email,
  status: user.status,
  role: user.role,
  avatar: user.avatar,
  department: user.department,
  title: user.title,
  location: user.location,
  customStatus: user.customStatus,
  activity: user.activity
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await models.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = await models.User.create({
      username,
      email,
      password, // Will be hashed by model hook
      name: username, // Default name to username
      status: 'online',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=b6e3f4`
    });

    // Create token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await models.User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update user status
    user.status = 'online';
    await user.save();

    // Create token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({
    user: formatUserResponse(req.user)
  });
});

module.exports = router; 