const tf = require('@tensorflow/tfjs-node');
const sharp = require('sharp');

class CleaningVerification {
  constructor() {
    this.model = null;
    this.loadModel();
  }
  
  async loadModel() {
    // Load pre-trained model for cleaning verification
    // This would be your actual ML model
    this.model = await tf.loadLayersModel('file://./ml-model/model/model.json');
  }
  
  async preprocessImage(imagePath) {
    const imageBuffer = await sharp(imagePath)
      .resize(224, 224)
      .toBuffer();
    
    const tensor = tf.node.decodeImage(imageBuffer)
      .resizeNearestNeighbor([224, 224])
      .toFloat()
      .div(255.0)
      .expandDims();
    
    return tensor;
  }
  
  async verifyCleaning(imagePath) {
    try {
      if (!this.model) {
        throw new Error('Model not loaded');
      }
      
      const tensor = await this.preprocessImage(imagePath);
      const prediction = this.model.predict(tensor);
      const result = await prediction.data();
      
      // Assuming binary classification: 0 = Not Clean, 1 = Clean
      const isClean = result[0] > 0.5;
      const confidence = result[0] * 100;
      
      return {
        verified: isClean,
        confidence: confidence.toFixed(2),
        verdict: isClean ? 'Cleaning Done' : 'Cleaning Not Done',
        details: `ML verification: ${confidence.toFixed(2)}% confidence`
      };
    } catch (error) {
      console.error('ML Verification error:', error);
      return {
        verified: false,
        confidence: 0,
        verdict: 'Verification Failed',
        details: 'ML model could not process image'
      };
    }
  }
}

module.exports = new CleaningVerification();