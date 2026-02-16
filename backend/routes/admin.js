const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Complaint = require('../models/Complaint');
const Worker = require('../models/Worker');

// Get dashboard stats (Admin only)
router.get('/stats', auth(['admin']), async (req, res) => {
  try {
    const stats = await Complaint.getStats();
    res.json({ success: true, data: { stats } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all workers (Admin only)
router.get('/workers', auth(['admin']), async (req, res) => {
  try {
    const workers = await Worker.getAll();
    res.json({ success: true, data: { workers } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;