const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');

const auth = (roles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          error: 'Access denied. No token provided.' 
        });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'greeneye_secret');
      
      let user;
      if (decoded.role === 'worker') {
        user = await Worker.findByEmail(decoded.email);
      } else {
        user = await User.findByEmail(decoded.email);
      }
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token.' 
        });
      }
      
      // Check if user has required role
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Access denied. Insufficient permissions.' 
        });
      }
      
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid token.' 
      });
    }
  };
};

module.exports = auth;