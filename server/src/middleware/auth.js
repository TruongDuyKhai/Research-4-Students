const { verifyToken } = require('../utils/jwt');
const usersModel = require('../models/usersModel');

/**
 * Middleware to require valid JWT authentication
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'No authorization token provided'
      }
    });
  }

  const token = authHeader.substring(7).trim();
  try {
    const decoded = verifyToken(token);

    // If admin, mock user object from token values (admin is not stored in DB)
    if (decoded.id === 0 && decoded.role === 'admin') {
      req.user = { id: 0, role: 'admin', username: 'admin' };
      return next();
    }

    // Lookup user in DB
    const user = usersModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User associated with this token not found'
        }
      });
    }

    // Block banned users
    if (user.status === 'banned') {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_BANNED',
          message: 'This account has been banned'
        }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authorization token'
      }
    });
  }
}

/**
 * Middleware to restrict route access by user roles
 * @param {string|string[]} roles
 */
function requireRole(roles) {
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!rolesArray.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: insufficient permissions'
        }
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
