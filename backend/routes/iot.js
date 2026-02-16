const express = require('express');
const router = express.Router();
const IOTData = require('../models/IOTData');

// Receive IoT data from ESP8266 (Public endpoint for IoT devices)
router.post('/bin-status', async (req, res) => {
  try {
    const { binId, location, fillLevel, distance } = req.body;
    
    // Determine status based on fill level
    let status = 'normal';
    if (fillLevel >= 90) {
      status = 'critical';
    } else if (fillLevel >= 70) {
      status = 'warning';
    }
    
    const iotData = await IOTData.create({
      binId,
      location,
      fillLevel,
      distance,
      status
    });
    
    // Emit real-time update to admin dashboard
    const io = req.app.get('io');
    io.to('admin-room').emit('iot-status-update', iotData);
    
    // If critical, send alert
    if (status === 'critical') {
      io.to('admin-room').emit('iot-alert', {
        type: 'dustbin-full',
        binId,
        location,
        fillLevel,
        message: `🚨 Dustbin full at ${location} (${fillLevel}% full)`,
        priority: 'high',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true, 
      message: 'IoT data received successfully',
      data: iotData 
    });
  } catch (error) {
    console.error('Error receiving IoT data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all IoT bins current status
router.get('/bins', async (req, res) => {
  try {
    const bins = await IOTData.findLatestStatus();
    res.json({ 
      success: true, 
      data: bins 
    });
  } catch (error) {
    console.error('Error fetching IoT bins:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get critical bins only
router.get('/bins/critical', async (req, res) => {
  try {
    const criticalBins = await IOTData.getCriticalBins();
    res.json({ 
      success: true, 
      data: criticalBins 
    });
  } catch (error) {
    console.error('Error fetching critical bins:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get bin history for charts
router.get('/bins/:binId/history', async (req, res) => {
  try {
    const { binId } = req.params;
    const { limit = 24 } = req.query;
    
    const history = await IOTData.getBinHistory(binId, parseInt(limit));
    res.json({ 
      success: true, 
      data: history 
    });
  } catch (error) {
    console.error('Error fetching bin history:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Register new IoT bin (Admin only)
router.post('/bins/register', async (req, res) => {
  try {
    const { binId, location, latitude, longitude, capacity } = req.body;
    
    // In a real system, you'd store this in a separate bins table
    // For now, we'll just acknowledge the registration
    
    res.json({ 
      success: true, 
      message: 'Bin registered successfully',
      data: {
        binId,
        location,
        latitude,
        longitude,
        capacity,
        registeredAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error registering bin:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;