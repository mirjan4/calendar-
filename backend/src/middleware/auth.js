const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid format'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Token expired or invalid signature'
      });
    }

    // Verify admin from database to ensure account is active and role hasn't changed
    const [rows] = await db.query(
      `SELECT id, username, email, full_name, role, is_active FROM admins WHERE id = ? LIMIT 1`,
      [decoded.id]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(403).json({
        success: false,
        message: 'Administrator account is deactivated or not found'
      });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: err.message
    });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: insufficient administrative privileges'
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};
