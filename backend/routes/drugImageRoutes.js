// routes/drugImageRoutes.js
import express from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import visionService from "../services/visionService.js";
import drugService from "../services/drugService.js";

// Create route handler
const router = express.Router();

/**
 * Process drug image endpoint
 * Extracts text from drug image and identifies the drug
 */
router.post("/process-drug-image", ClerkExpressRequireAuth(), async (req, res) => {
  console.log("Processing drug image request:", req.body);
  
  const { imageUrl } = req.body;
  
  if (!imageUrl) {
    console.log("Missing imageUrl in request");
    return res.status(400).json({ error: "Image URL is required" });
  }
  
  try {
    // Verify Google credentials are configured
    console.log("Google Credentials Path:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set");
    }
    
    // Extract text from the image using Vision API
    console.log("Calling Vision API for image:", imageUrl);
    const extractedText = await visionService.extractTextFromImage(imageUrl);
    console.log("Extracted text:", extractedText);
    
    // No text was extracted
    if (!extractedText) {
      console.log("No text extracted from image");
      return res.status(422).json({
        message: "No text could be extracted from the image",
        extractedText: "",
        identifiedDrug: null
      });
    }
    
    // Identify the drug from the extracted text using embedding approach
    console.log("Identifying drug from text using embedding");
    const identifiedDrug = await drugService.identifyDrug(extractedText);
    console.log("Identified drug:", identifiedDrug);
    
    return res.status(200).json({
      message: "Drug image processed successfully",
      extractedText,
      identifiedDrug
    });
  } catch (error) {
    console.error("Error processing drug image:", error);
    // Return a more detailed error response
    return res.status(500).json({ 
      error: "Failed to process drug image",
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

export default router;