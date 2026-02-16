const express = require('express');
const multer = require('multer');
const path = require('path');
const Complaint = require('../models/Complaint');
const auth = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Public route - Create complaint (no authentication required)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      issueType, 
      description, 
      address, 
      latitude, 
      longitude, 
      customIssue 
    } = req.body;
    
    // For public complaints, store user info directly
    const complaintData = {
      userId: null, // No user account required
      userName: name,
      userEmail: email,
      userPhone: phone,
      issueType,
      description,
      address,
      latitude: latitude || null,
      longitude: longitude || null,
      imagePath: req.file ? req.file.filename : null,
      customIssue: customIssue || null
    };
    
    const complaint = await Complaint.create(complaintData);
    
    // Emit real-time notification to admin
    req.app.get('io').to('admin-room').emit('new-complaint', {
      complaint,
      type: 'public-complaint'
    });
    
    res.json({ 
      success: true, 
      message: 'Complaint submitted successfully!',
      data: complaint 
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all complaints (Admin only)
router.get('/', auth(['admin']), async (req, res) => {
  try {
    const complaints = await Complaint.getAll();
    res.json({ success: true, data: complaints });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update complaint status (Admin only)
router.put('/:id/status', auth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const complaint = await Complaint.updateStatus(id, updateData);
    
    // Emit status update
    req.app.get('io').to('admin-room').emit('complaint-updated', {
      complaint,
      type: 'status-update'
    });
    
    res.json({ success: true, data: complaint });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;