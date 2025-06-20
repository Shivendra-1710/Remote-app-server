const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { models } = require('../config/db');

class UserController {
  constructor(io) {
    this.io = io;
  }

  // Register new user
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Check if user already exists
      const existingUser = await models.User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await models.User.create({
        username,
        email,
        password: hashedPassword,
        status: 'offline',
        lastActive: new Date()
      });

      // Create token
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          status: user.status
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register user'
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await models.User.findOne({ where: { email } });
      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Update status and last active
      user.status = 'online';
      user.lastActive = new Date();
      await user.save();

      // Create token
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          status: user.status
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to login'
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const { userId } = req.params;

      const user = await models.User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { userId } = req.params;
      const updates = req.body;

      // Don't allow password update through this endpoint
      delete updates.password;

      const user = await models.User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Update user
      await user.update(updates);

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          status: user.status
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user profile'
      });
    }
  }

  // Get online users
  async getOnlineUsers(req, res) {
    try {
      const users = await models.User.findAll({
        where: {
          status: 'online',
          id: { [models.Sequelize.Op.ne]: req.user.id } // Exclude current user
        },
        attributes: { exclude: ['password'] }
      });

      res.json({
        success: true,
        users
      });
    } catch (error) {
      console.error('Get online users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch online users'
      });
    }
  }

  // Get current user profile
  async getCurrentProfile(req, res) {
    try {
      const user = await models.User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get current profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile'
      });
    }
  }

  // Update current user profile
  async updateCurrentProfile(req, res) {
    try {
      const updates = req.body;

      // Don't allow password update through this endpoint
      delete updates.password;

      const user = await models.User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Update user
      await user.update(updates);

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          status: user.status,
          role: user.role,
          avatar: user.avatar,
          department: user.department,
          title: user.title,
          location: user.location
        }
      });
    } catch (error) {
      console.error('Update current profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user profile'
      });
    }
  }
}

module.exports = UserController; 