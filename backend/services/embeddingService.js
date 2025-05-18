// services/embeddingService.js
import fetch from 'node-fetch';

class EmbeddingService {
  constructor() {
    this.baseUrl = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:5001';
    console.log(`Embedding service URL: ${this.baseUrl}`);
  }

  /**
   * Check if embedding service is available
   * @returns {Promise<boolean>} - Whether the service is available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        timeout: 2000, // 2 second timeout
      });
      return response.ok;
    } catch (error) {
      console.error('Embedding service not available:', error.message);
      return false;
    }
  }

  /**
   * Match drugs in extracted text using embeddings
   * @param {string} extractedText - Text extracted from drug image
   * @param {number} threshold - Similarity threshold
   * @returns {Promise<Object>} - Matched drugs
   */
  async matchDrugs(extractedText, threshold = 0.8) {
    try {
      // Check if service is available first
      const isServiceAvailable = await this.isAvailable();
      if (!isServiceAvailable) {
        throw new Error('Embedding service is not available');
      }
      
      const response = await fetch(`${this.baseUrl}/match_drugs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          extracted_text: extractedText,
          threshold
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to match drugs: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error matching drugs:', error);
      throw error;
    }
  }
}

export default new EmbeddingService();