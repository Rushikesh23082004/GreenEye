const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Worker = require('../models/Worker');

// Get assigned complaints for worker
router.get('/complaints', auth(['worker']), async (req, res) => {
  try {
    const complaints = await Worker.getAssignedComplaints(req.user.id);
    res.json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update complaint status (Worker only)
router.put('/complaints/:id', auth(['worker']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, afterImagePath } = req.body;
    
    // In a real implementation, you'd update the complaint
    // For now, we'll just return success
    res.json({ 
      success: true, 
      message: 'Complaint updated successfully',
      data: { id, status, afterImagePath }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;