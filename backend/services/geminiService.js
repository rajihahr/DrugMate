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
   * Creates a new model instance with the appropriate system prompt based on chat type
   */
  getModel(chatType = "general", modelName = "gemini-2.0-flash") {
    // Select the appropriate system prompt based on chat type
    let systemInstruction = this.systemPrompt; // Default system prompt
    
    if (chatType === "drugInteraction") {
      systemInstruction = this.systemPrompt + `

ADDITIONAL GUIDELINES FOR DRUG INTERACTION CHECKS:

When responding to drug interaction queries:
1. Clearly state if there is a known interaction between the medications
2. Classify the severity of the interaction (minor, moderate, severe)
3. Explain the potential effects of taking both medications together
4. Provide general guidance on managing the interaction (spacing doses, monitoring for symptoms, etc.)
5. Suggest when to consult a healthcare provider about the interaction
6. Note any specific populations at higher risk from the interaction (elderly, those with certain conditions, etc.)

Present information in these sections:
## Interaction Overview
(Brief statement of whether an interaction exists and its severity)

## Potential Effects
(What might happen if taken together)

## Management Considerations
(General guidance on how to manage the interaction)

## When to Seek Medical Advice
(Circumstances where a healthcare provider should be consulted)

## Additional Information
(Any other relevant details about the medications)

## Disclaimer
(Standard medical disclaimer)

Remember to note if information is limited about certain drug combinations and emphasize the importance of pharmacist or doctor consultation.`;
    } else if (chatType === "emergency") {
      systemInstruction = this.systemPrompt + `

ADDITIONAL GUIDELINES FOR EMERGENCY ASSISTANCE:

When responding to potential medical emergencies:
1. FIRST ASSESS SEVERITY - Ask clear questions to determine urgency
2. For life-threatening emergencies, IMMEDIATELY advise calling 911/emergency services
3. Provide simple, step-by-step first aid guidance while waiting for emergency services
4. For non-emergencies, offer supportive guidance while emphasizing professional care
5. Ask focused questions about specific symptoms to better assess the situation
6. Use a calm, reassuring tone while remaining factual and practical
7. At appropriate times, suggest finding nearby healthcare facilities

Present emergency information in these sections:
## Assessment
(Brief statement about the apparent severity and immediate steps)

## Immediate Actions
(What to do right now - call 911, basic first aid, etc.)

## Key Information
(Important details about the condition or symptoms)

## Next Steps
(What to do after immediate actions are taken)

## When to Seek Medical Care
(Clear guidance on when professional help is needed)

## Disclaimer
(Standard medical disclaimer with emphasis on emergency care)

CRITICAL: For severe symptoms such as difficulty breathing, chest pain, severe bleeding, loss of consciousness, stroke symptoms, or severe allergic reactions, ALWAYS emphasize immediate emergency services (911).

Maintain a calm, authoritative tone that inspires confidence while prioritizing user safety above all else.`;
    }
    
    return this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction,
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
   * @param {Object} options - Additional options including chatType
   */
  async generateResponse(history, question, options = {}) {
    try {
      const chatType = options.chatType || "general";
      const model = this.getModel(chatType, options.modelName);
      
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
   * Creates a specialized prompt for drug interaction checks
   * @param {Object} drug1 - First drug information
   * @param {Object} drug2 - Second drug information
   * @returns {String} Formatted prompt for drug interaction check
   */
  createDrugInteractionPrompt(drug1 = {}, drug2 = {}) {
    const drug1Name = drug1?.name || "Unknown Drug";
    const drug2Name = drug2?.name || "Unknown Drug";
    
    const drug1Ingredients = drug1?.ingredients?.join(", ") || "Unknown";
    const drug2Ingredients = drug2?.ingredients?.join(", ") || "Unknown";
    
    return `Check for interactions between these two drugs:
    Drug 1: ${drug1Name} (Ingredients: ${drug1Ingredients})
    Drug 2: ${drug2Name} (Ingredients: ${drug2Ingredients})
    
    Please provide information about potential interactions between these medications, including:
    1. Severity of any interactions (mild, moderate, severe)
    2. What effects might occur if taken together
    3. Recommendations for safe use
    4. Alternative options if applicable`;
  }
  
  /**
   * Creates a specialized prompt for emergency assistance
   * @returns {String} Formatted prompt for emergency assistance
   */
  createEmergencyPrompt() {
    return `I need emergency assistance or medical advice. Please help me assess my situation and understand what I should do. If I describe a serious medical emergency, please remind me to call emergency services (911) immediately, and provide first aid guidance while waiting for help. If my situation is less urgent, please provide appropriate guidance and support.`;
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