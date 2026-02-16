const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Mock ML verification endpoint - No TensorFlow dependency
router.post('/verify-cleaning', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }

    // Process image with sharp (lightweight image processing)
    const imagePath = req.file.path;
    const metadata = await sharp(imagePath).metadata();
    
    // Simulate ML processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Enhanced mock ML verification based on image analysis
    const imageSize = metadata.width * metadata.height;
    const aspectRatio = metadata.width / metadata.height;
    
    // Mock analysis based on image characteristics
    let cleanlinessScore = Math.random();
    
    // Adjust score based on some mock "analysis"
    if (imageSize > 1000000) { // Larger images might be clearer
      cleanlinessScore += 0.1;
    }
    if (aspectRatio > 0.8 && aspectRatio < 1.2) { // Square-ish images
      cleanlinessScore += 0.05;
    }
    
    cleanlinessScore = Math.min(cleanlinessScore, 1); // Cap at 1
    const isClean = cleanlinessScore > 0.4; // 60% chance of "clean"
    const confidence = (cleanlinessScore * 100).toFixed(2);

    const verificationResult = {
      verified: isClean,
      confidence: confidence,
      verdict: isClean ? 'Cleaning Done' : 'Cleaning Not Done',
      details: `Image analysis: ${confidence}% confidence (${metadata.width}x${metadata.height})`,
      modelVersion: '1.0-mock',
      processingTime: '1.5s',
      imageAnalysis: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        channels: metadata.channels
      }
    };

    res.json({
      success: true,
      data: verificationResult,
      imagePath: req.file.filename
    });
  } catch (error) {
    console.error('ML verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Image processing service unavailable' 
    });
  }
});

// Health check for ML service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'ML Verification Service',
      status: 'operational',
      version: '1.0-mock',
      description: 'Mock ML service using image metadata analysis'
    }
  });
});

module.exports = router;