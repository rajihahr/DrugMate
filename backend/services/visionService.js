// services/visionService.js - with improved error handling
import vision from '@google-cloud/vision';
import fs from 'fs';

class VisionService {
  constructor() {
    try {
      // Check if credentials file exists
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (credentialsPath) {
        if (!fs.existsSync(credentialsPath)) {
          console.error(`Google credentials file not found at: ${credentialsPath}`);
        } else {
          console.log(`Google credentials found at: ${credentialsPath}`);
        }
      }
      
      // Initialize Vision client
      this.client = new vision.ImageAnnotatorClient();
      console.log("Vision client initialized successfully");
    } catch (error) {
      console.error("Error initializing Vision client:", error);
      throw error;
    }
  }

  /**
   * Extract text from an image URL
   * @param {string} imageUrl - The URL of the image to process
   * @returns {Promise<string>} - The extracted text
   */
  async extractTextFromImage(imageUrl) {
    try {
      console.log(`Extracting text from image: ${imageUrl}`);
      
      // Perform text detection on the image
      const [result] = await this.client.textDetection(imageUrl);
      
      if (!result) {
        console.log("No result returned from Vision API");
        return '';
      }
      
      const detections = result.textAnnotations;
      console.log(`Got ${detections?.length || 0} text annotations`);
      
      // The first text annotation contains the entire extracted text
      if (detections && detections.length > 0) {
        return detections[0].description;
      }
      
      return '';
    } catch (error) {
      console.error('Error extracting text from image:', error);
      throw new Error(`Failed to extract text from image: ${error.message}`);
    }
  }
}

export default new VisionService();