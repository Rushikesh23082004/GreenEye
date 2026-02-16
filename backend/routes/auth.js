const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');
const router = express.Router();

// User Registration (No login required)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists with this email' 
      });
    }
    
    // Create new user
    const user = await User.create({
      name, email, password, phone, address
    });
    
    res.json({ 
      success: true, 
      message: 'User registered successfully',
      data: user 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// User/Admin/Worker Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    
    let user;
    
    if (userType === 'worker') {
      // Worker login
      user = await Worker.findByEmail(email);
      if (!user) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid worker credentials' 
        });
      }
      
      const isValidPassword = await Worker.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid worker credentials' 
        });
      }
      
    } else {
      // User/Admin login
      user = await User.findByEmail(email);
      if (!user) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }
      
      const isValidPassword = await User.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: userType === 'worker' ? 'worker' : user.role,
        name: user.name 
      },
      process.env.JWT_SECRET || 'greeneye_secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: userType === 'worker' ? 'worker' : user.role,
          ...(userType === 'worker' && { phone: user.phone, address: user.address })
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Public route - Check if email exists (for registration)
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findByEmail(email);
    
    res.json({
      success: true,
      data: {
        exists: !!user
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;