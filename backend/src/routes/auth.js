const express = require('express');
const router = express.Router();
const { login, changePassword } = require('../services/cognitoService');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await login(email, password);

    if (!result.success) {
      if (result.requiresNewPassword) {
        return res.status(403).json({
          success: false,
          requiresNewPassword: true,
          session: result.session,
          error: 'New password required'
        });
      }
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      tokens: result.tokens
    });
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const { session, newPassword } = req.body;

    if (!session || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Session and new password are required'
      });
    }

    const result = await changePassword(session, newPassword);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Change password route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 