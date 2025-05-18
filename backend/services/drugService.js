// services/drugService.js
import fs from 'fs/promises';
import path from 'path';
import embeddingService from './embeddingService.js';

class DrugService {
  constructor() {
    this.drugsData = null;
    this.loadDrugsData();
  }

  /**
   * Load drugs data from JSON file
   */
  async loadDrugsData() {
    try {
      const dataPath = path.resolve(process.cwd(), 'data/drugs.json');
      const data = await fs.readFile(dataPath, 'utf8');
      this.drugsData = JSON.parse(data);
      console.log(`Loaded ${this.drugsData.length} drug entries`);
    } catch (error) {
      console.error('Error loading drugs data:', error);
      // Initialize with empty array if file cannot be loaded
      this.drugsData = [];
    }
  }

  /**
   * Identify drug names from extracted text using embeddings
   * @param {string} extractedText - Text extracted from drug image
   * @returns {Promise<object>} - Identified drug information
   */
  async identifyDrug(extractedText) {
    if (!this.drugsData || !extractedText) {
      return null;
    }

    try {
      console.log(`Identifying drug from extracted text: "${extractedText}"`);
      
      // Use embedding service to match drugs
      const result = await embeddingService.matchDrugs(extractedText);
      console.log('Embedding matching result:', JSON.stringify(result, null, 2));
      
      // Return the first matched drug, if any
      if (result.matched_drugs && result.matched_drugs.length > 0) {
        return result.matched_drugs[0];
      }
      
      // Fallback to exact string matching if no matches from embeddings
      console.log('No matches found with embeddings, falling back to string matching');
      return this.identifyDrugByStringMatching(extractedText);
    } catch (error) {
      console.error('Error identifying drug with embeddings:', error);
      console.log('Falling back to string matching due to error');
      // Fallback to string matching in case of errors
      return this.identifyDrugByStringMatching(extractedText);
    }
  }
  
  /**
   * Identify drug using simple string matching (fallback method)
   * @param {string} extractedText - Text extracted from drug image
   * @returns {object|null} - Identified drug information
   */
  identifyDrugByStringMatching(extractedText) {
    // Convert extracted text to uppercase for case-insensitive matching
    const upperText = extractedText.toUpperCase();
    
    // First, try to find exact drug name match
    let match = this.drugsData.find(drug => 
      upperText.includes(drug.name.toUpperCase())
    );
    
    // If no match by name, try matching by ingredients
    if (!match) {
      match = this.drugsData.find(drug => 
        drug.ingredients.some(ingredient => 
          upperText.includes(ingredient.toUpperCase())
        )
      );
    }
    
    return match || null;
  }
}

export default new DrugService();