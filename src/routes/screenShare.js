const express = require('express');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const createScreenShareRouter = (screenShareController) => {
  const router = express.Router();

  // Create a new screen sharing session
  router.post(
    '/sessions',
    auth,
    [
      body('clientId').isUUID().withMessage('Invalid client ID'),
    ],
    validate,
    screenShareController.createSession.bind(screenShareController)
  );

  // Get all sessions for a user
  router.get(
    '/sessions/:userId',
    auth,
    [
      param('userId').isUUID().withMessage('Invalid user ID'),
    ],
    validate,
    screenShareController.getSessions.bind(screenShareController)
  );

  // End a session
  router.put(
    '/sessions/:sessionId/end',
    auth,
    [
      param('sessionId').isUUID().withMessage('Invalid session ID'),
    ],
    validate,
    screenShareController.endSession.bind(screenShareController)
  );

  // Get session statistics
  router.get(
    '/stats/:userId',
    auth,
    [
      param('userId').isUUID().withMessage('Invalid user ID'),
    ],
    validate,
    screenShareController.getSessionStats.bind(screenShareController)
  );

  return router;
};

module.exports = { createScreenShareRouter }; 