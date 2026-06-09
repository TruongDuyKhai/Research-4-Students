const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your_access_secret_here';

function isAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Admin access token is missing.' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized. Admin token is invalid or expired.' });
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin credentials required.' });
    }

    req.isAdmin = true;
    req.user = decoded; // also attach user for general compatibility
    next();
  });
}

module.exports = isAdmin;
