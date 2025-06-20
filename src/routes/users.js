const express = require('express');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { models, Op } = require('../config/db');

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

const createUserRouter = (userController) => {
  const router = express.Router();

  // Create new user (admin only)
  router.post(
    '/create',
    auth,
    [
      // Check if user is admin
      (req, res, next) => {
        if (req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Only admins can create new users' });
        }
        next();
      },
      // Validate input
      body('username')
        .trim()
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers and underscores'),
      body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required'),
      body('email')
        .isEmail()
        .withMessage('Please enter a valid email')
        .normalizeEmail(),
      body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
      body('role')
        .isIn(['admin', 'user'])
        .withMessage('Role must be either admin or user'),
      body('department')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Department cannot be empty if provided'),
      body('title')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Title cannot be empty if provided'),
      body('location')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Location cannot be empty if provided'),
      body('status')
        .optional()
        .isIn(['online', 'offline', 'busy', 'in-call', 'idle', 'dnd'])
        .withMessage('Invalid status')
    ],
    validate,
    async (req, res) => {
      try {
        // Check if username or email already exists
        const existingUser = await models.User.findOne({
          where: {
            [Op.or]: [
              { username: req.body.username },
              { email: req.body.email }
            ]
          }
        });

        if (existingUser) {
          return res.status(400).json({
            error: existingUser.username === req.body.username
              ? 'Username already taken'
              : 'Email already registered'
          });
        }

        // Create new user
        const userData = {
          username: req.body.username,
          name: req.body.name,
          email: req.body.email,
          password: req.body.password,
          role: req.body.role,
          status: req.body.status || 'offline',
          department: req.body.department,
          title: req.body.title,
          location: req.body.location,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.body.username}`
        };

        const newUser = await models.User.create(userData);
        res.status(201).json(formatUserResponse(newUser));
      } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
      }
    }
  );

  // Register new user
  router.post(
    '/register',
    [
      body('username')
        .trim()
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long'),
      body('email')
        .isEmail()
        .withMessage('Please enter a valid email'),
      body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    ],
    validate,
    userController.register.bind(userController)
  );

  // Login user
  router.post(
    '/login',
    [
      body('email')
        .isEmail()
        .withMessage('Please enter a valid email'),
      body('password')
        .exists()
        .withMessage('Password is required'),
    ],
    validate,
    userController.login.bind(userController)
  );

  // Get all users
  router.get(
    '/',
    auth,
    async (req, res) => {
      try {
        const users = await models.User.findAll({
          where: {
            id: { [Op.ne]: req.user.id } // Exclude current user
          },
          attributes: { exclude: ['password'] }
        });
        res.json({ users: users.map(formatUserResponse) });
      } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
      }
    }
  );

  // Get current user profile
  router.get(
    '/profile',
    auth,
    async (req, res) => {
      try {
        const user = await req.user.reload();
        res.json(formatUserResponse(user));
      } catch (error) {
        console.error('Get current profile error:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
      }
    }
  );

  // Get user profile by ID
  router.get(
    '/profile/:userId',
    auth,
    [
      param('userId').isUUID().withMessage('Invalid user ID'),
    ],
    validate,
    userController.getProfile.bind(userController)
  );

  // Update current user profile
  router.put(
    '/profile',
    auth,
    [
      body('username')
        .optional()
        .trim()
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long'),
      body('email')
        .optional()
        .isEmail()
        .withMessage('Please enter a valid email'),
      body('status')
        .optional()
        .isIn(['online', 'offline', 'busy', 'in-call', 'idle', 'dnd'])
        .withMessage('Invalid status'),
    ],
    validate,
    async (req, res) => {
      try {
        const updates = req.body;
        delete updates.password; // Don't allow password updates through this endpoint

        const user = await req.user.update(updates);
        res.json(formatUserResponse(user));
      } catch (error) {
        console.error('Update current profile error:', error);
        res.status(500).json({ error: 'Failed to update user profile' });
      }
    }
  );

  // Update user profile by ID
  router.put(
    '/profile/:userId',
    auth,
    [
      param('userId').isUUID().withMessage('Invalid user ID'),
      body('username')
        .optional()
        .trim()
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long'),
      body('email')
        .optional()
        .isEmail()
        .withMessage('Please enter a valid email'),
      body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    ],
    validate,
    userController.updateProfile.bind(userController)
  );

  // Update user status
  router.put(
    '/status',
    auth,
    [
      body('status')
        .isIn(['online', 'offline', 'busy', 'in-call', 'idle', 'dnd'])
        .withMessage('Invalid status'),
    ],
    validate,
    async (req, res) => {
      try {
        const { status } = req.body;
        const user = await req.user.update({ status });
        res.json(formatUserResponse(user));
      } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
      }
    }
  );

  // Get online users
  router.get(
    '/online',
    auth,
    async (req, res) => {
      try {
        const users = await models.User.findAll({
          where: {
            status: 'online',
            id: { [Op.ne]: req.user.id }
          },
          attributes: { exclude: ['password'] }
        });
        res.json({ users: users.map(formatUserResponse) });
      } catch (error) {
        console.error('Get online users error:', error);
        res.status(500).json({ error: 'Failed to fetch online users' });
      }
    }
  );

  return router;
};

module.exports = { createUserRouter }; 