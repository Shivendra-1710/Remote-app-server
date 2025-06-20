const { models } = require('../config/db');

class ScreenShareController {
  constructor(io) {
    this.io = io;
  }

  // Handle screen sharing session creation
  async createSession(req, res) {
    try {
      const { hostId, clientId } = req.body;

      const session = await models.ScreenShareSession.create({
        hostId,
        clientId,
        status: 'pending',
        startTime: new Date()
      });

      // Notify client about new session
      this.io.to(clientId).emit('screenShare:sessionCreated', {
        sessionId: session.id,
        hostId
      });

      res.status(201).json({
        success: true,
        session
      });
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create screen sharing session'
      });
    }
  }

  // Get active sessions for a user
  async getSessions(req, res) {
    try {
      const { userId } = req.params;

      const sessions = await models.ScreenShareSession.findAll({
        where: {
          [models.Sequelize.Op.or]: [
            { hostId: userId },
            { clientId: userId }
          ],
          status: ['active', 'pending']
        },
        include: [
          {
            model: models.User,
            as: 'host',
            attributes: ['id', 'username', 'email']
          },
          {
            model: models.User,
            as: 'client',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      res.json({
        success: true,
        sessions
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch screen sharing sessions'
      });
    }
  }

  // End a screen sharing session
  async endSession(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await models.ScreenShareSession.findByPk(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      session.status = 'ended';
      session.endTime = new Date();
      await session.save();

      // Notify participants
      this.io.to(session.hostId).emit('screenShare:sessionEnded', { sessionId });
      this.io.to(session.clientId).emit('screenShare:sessionEnded', { sessionId });

      res.json({
        success: true,
        session
      });
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to end screen sharing session'
      });
    }
  }

  // Get session statistics
  async getSessionStats(req, res) {
    try {
      const { userId } = req.params;

      const stats = await models.ScreenShareSession.findAll({
        where: {
          [models.Sequelize.Op.or]: [
            { hostId: userId },
            { clientId: userId }
          ]
        },
        attributes: [
          'status',
          [models.Sequelize.fn('COUNT', '*'), 'count'],
          [models.Sequelize.fn('AVG', 
            models.Sequelize.fn('TIMESTAMPDIFF', 
              models.Sequelize.literal('MINUTE'), 
              models.Sequelize.col('startTime'), 
              models.Sequelize.col('endTime')
            )
          ), 'averageDuration']
        ],
        group: ['status']
      });

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch session statistics'
      });
    }
  }
}

module.exports = ScreenShareController; 