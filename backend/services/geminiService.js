import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Safety settings for all model instances
    this.safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
    
    // System prompt for medical information responses
    this.systemPrompt = `
You are DrugMate, an AI assistant specializing in providing reliable information about medications and health topics.

Follow these guidelines for ALL responses:

1. RELIABILITY
   - Base information on established medical knowledge
   - Include sources when providing specific information [Source: X]
   - Clearly indicate when information is general knowledge vs. specific medical facts

2. SIMPLICITY
   - Use plain, everyday language that non-medical professionals can understand
   - Define any necessary medical terms when they first appear
   - Avoid unnecessary jargon or abbreviations

3. READABILITY
   - Use short paragraphs with clear topic sentences
   - Include bullet points for lists of symptoms, side effects, or instructions
   - Use headings (## Heading) to organize longer responses

4. STRUCTURE
   - Always follow this content structure:
     a) Direct answer to the question (1-2 sentences)
     b) Key information section with relevant details
     c) Important considerations or warnings when applicable
     d) Summary or next steps

5. SAFETY
   - Include a disclaimer in ALL responses about consulting healthcare providers
   - Never provide specific medical advice, dosage recommendations, or diagnoses
   - Clearly state limitations of the information provided

When discussing medications:
- Explain general purpose and drug class
- Note common side effects and general usage patterns
- Mention common drug interactions in general terms
- NEVER recommend specific dosages for individuals

IMPORTANT: Always maintain a helpful, informative tone while prioritizing user safety.
`;
  }
  
  /**
   * Creates a new model instance with the system prompt
   */
  getModel(modelName = "gemini-2.0-flash") {
    return this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: this.systemPrompt,
      safetySettings: this.safetySettings,
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent responses
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });
  }
  
  /**
   * Processes a chat history and generates a response
   * @param {Array} history - Chat history in the expected format
   * @param {String} question - The current question
   * @param {Object} options - Additional options
   */
  async generateResponse(history, question, options = {}) {
    try {
      const model = this.getModel(options.modelName);
      
      // Format history for Gemini
      const formattedHistory = this.formatChatHistory(history);
      
      // Start a chat session with history
      const chat = model.startChat({
        history: formattedHistory,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 1024,
        },
      });
      
      // Generate response
      const result = await chat.sendMessage(question);
      let response = result.response.text();
      
      // Apply post-processing to ensure formatting standards are met
      response = this.formatResponse(response);
      
      return response;
    } catch (error) {
      console.error("Error generating response:", error);
      return "I'm sorry, I encountered an error while processing your request. Please try again later.";
    }
  }
  
  /**
   * Formats chat history to the format expected by Gemini
   */
  formatChatHistory(history) {
    if (!history || history.length === 0) return [];
    
    return history.map(msg => ({
      role: msg.role === "model" ? "model" : "user",
      parts: msg.parts.map(part => ({ text: part.text }))
    }));
  }
  
  /**
   * Ensures response meets formatting standards
   */
  formatResponse(response) {
    // Check if response already has headers
    const hasHeaders = /^##\s.+/m.test(response);
    
    // Check if response has a disclaimer
    const hasDisclaimer = response.toLowerCase().includes("consult") && 
                         (response.toLowerCase().includes("healthcare provider") || 
                          response.toLowerCase().includes("doctor"));
    
    // If response is well-formatted, just ensure it has a disclaimer
    if (hasHeaders && hasDisclaimer) {
      return response;
    }
    
    // Add structure if missing
    let formattedResponse = response;
    
    // Add headers if missing
    if (!hasHeaders) {
      const paragraphs = response.split(/\n\s*\n/);
      
      if (paragraphs.length > 1) {
        // Simple structure with key information and considerations
        formattedResponse = `## Response\n${paragraphs[0]}\n\n## Key Information\n${paragraphs.slice(1, -1).join('\n\n')}\n\n## Additional Considerations\n${paragraphs[paragraphs.length - 1]}`;
      }
    }
    
    // Add disclaimer if missing
    if (!hasDisclaimer) {
      formattedResponse += `\n\n## Disclaimer\nThis information is for educational purposes only and is not a substitute for professional medical advice. Always consult with a healthcare provider for medical guidance regarding your specific situation.`;
    }
    
    return formattedResponse;
  }
  
    // Generates a summary of a chat conversation
  async generateSummary(chatContent) {
    try {
      const model = this.getModel();
      
      const promptText = `Summarize the following conversation about medications or healthcare. 
      Focus on the key points, questions, and answers. 
      Format the summary in clear sections with bullet points where appropriate. 
      Make sure to include any important medical information, instructions, or warnings that were discussed.
      
      Here's the conversation:
      ${chatContent}`;
      
      const result = await model.generateContent(promptText);
      return result.response.text();
    } catch (error) {
      console.error("Error generating summary:", error);
      return "Unable to generate summary. Please try again later.";
    }
  }
}

export default new GeminiService();