const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const { logAction } = require('../utils/auditLogger');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and Password are required'
      });
    }

    const [rows] = await db.query(
      `SELECT id, username, email, password_hash, full_name, role, is_active 
       FROM admins 
       WHERE username = ? OR email = ? 
       LIMIT 1`,
      [username.trim(), username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const admin = rows[0];

    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your administrator account has been disabled. Contact system supervisor.'
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last_login
    await db.query(`UPDATE admins SET last_login = NOW() WHERE id = ?`, [admin.id]);

    // Generate JWT
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        fullName: admin.full_name
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    // Audit log
    await logAction({
      adminId: admin.id,
      action: 'ADMIN_LOGIN',
      entityType: 'admin',
      entityId: admin.id,
      details: { username: admin.username, ip: req.ip },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        fullName: admin.full_name,
        role: admin.role
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    return res.json({
      success: true,
      admin: req.user
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.user) {
      await logAction({
        adminId: req.user.id,
        action: 'ADMIN_LOGOUT',
        entityType: 'admin',
        entityId: req.user.id,
        ipAddress: req.ip
      });
    }
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const adminId = req.user.id;
    const { fullName, currentPassword, newPassword } = req.body;

    const [rows] = await db.query(
      `SELECT id, username, email, password_hash, full_name, role, is_active FROM admins WHERE id = ? LIMIT 1`,
      [adminId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }

    const admin = rows[0];
    const updateFields = [];
    const updateParams = [];

    let updatedFullName = admin.full_name;
    if (fullName && fullName.trim()) {
      const trimmedName = fullName.trim();
      updateFields.push('full_name = ?');
      updateParams.push(trimmedName);
      updatedFullName = trimmedName;
    }

    let passwordUpdated = false;
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      // If current password is provided, verify it. If forgotten, allow authenticated admin to set new password directly
      if (currentPassword) {
        const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: 'Current password is incorrect'
          });
        }
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      updateFields.push('password_hash = ?');
      updateParams.push(newHash);
      passwordUpdated = true;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes provided'
      });
    }

    updateParams.push(adminId);
    await db.query(`UPDATE admins SET ${updateFields.join(', ')} WHERE id = ?`, updateParams);

    const newToken = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        fullName: updatedFullName
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    await logAction({
      adminId: admin.id,
      action: 'ADMIN_PROFILE_UPDATE',
      entityType: 'admin',
      entityId: admin.id,
      details: {
        nameChanged: updatedFullName !== admin.full_name,
        passwordChanged: passwordUpdated
      },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: passwordUpdated ? 'Password updated successfully' : 'Profile name updated successfully',
      token: newToken,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        fullName: updatedFullName,
        role: admin.role
      }
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and New Password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const [rows] = await db.query(
      `SELECT id, username, email, full_name, is_active FROM admins WHERE username = ? OR email = ? LIMIT 1`,
      [username.trim(), username.trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Administrator account not found'
      });
    }

    const admin = rows[0];

    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Administrator account is deactivated'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    // Update password_hash ONLY; full_name is completely preserved without any change
    await db.query(`UPDATE admins SET password_hash = ? WHERE id = ?`, [newHash, admin.id]);

    await logAction({
      adminId: admin.id,
      action: 'ADMIN_PASSWORD_RESET',
      entityType: 'admin',
      entityId: admin.id,
      details: { username: admin.username, ip: req.ip },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Password changed successfully. You can now sign in with your new password.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getProfile,
  updateProfile,
  resetPassword,
  logout
};
