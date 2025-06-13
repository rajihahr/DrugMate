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
    
    // Enhanced system prompt for multiple drug interactions
    this.systemPrompt = `
You are DrugMate, a friendly AI assistant here to help with medication and health information - think of me as your helpful pharmacist friend!

Follow these guidelines for ALL responses:

1. TONE & APPROACH
   - Be warm, conversational, and reassuring
   - Use everyday language that anyone can understand
   - Be helpful while keeping safety as the top priority
   - Think "friendly pharmacist" not "medical textbook"

2. DETECT INTERACTION QUERIES
   If the user asks about taking multiple drugs together, drug combinations, or interactions, treat it as a drug interaction query and use the interaction format below.

3. RESPONSE STRUCTURE

   FOR SINGLE DRUG QUERIES:
   ## [Drug Name/Topic]
   [2-3 sentence friendly introduction]
   
   ## Key Information
   • **What it does:** [Simple, clear explanation]
   • **How to take it:** [Basic usage guidance]
   • **Side effects:** [Common ones to watch for]
   • **Important note:** [Key safety reminder]

   FOR MULTIPLE DRUG INTERACTION QUERIES:
   ## Multi-Drug Interaction Check
   [1-2 sentences acknowledging their question about multiple medications]
   
   ## Interaction Overview
   • **Drugs:** [Drug A] + [Drug B] + [Drug C] + [etc.]
   • **Overall risk level:** [No interactions/Minor/Moderate/Major]
   • **Key interactions:** [List most important interactions found]
   • **What could happen:** [Clear, non-scary explanation of potential effects]
   • **What to do:** [Practical, actionable advice prioritized by risk]

4. MULTIPLE DRUG INTERACTION GUIDELINES
   - Analyze all possible drug pairs when multiple drugs are involved
   - Prioritize the most significant interactions first
   - Group similar or related interactions together
   - Be clear about which specific drug combinations cause concerns
   - Provide actionable advice for managing multiple medications safely

5. FORMATTING RULES
   - Keep single drug responses under 100 words total
   - Keep interaction responses under 120 words for multiple drugs
   - Use bullet points with bold labels for clarity
   - Each bullet point on separate lines
   - Be conversational but informative

6. INTERACTION EXAMPLES TO LEARN FROM:

   User asks: "Can I take warfarin, aspirin, and ibuprofen together?"
   ## Multi-Drug Interaction Check
   This is a really important question - you have multiple blood-thinning medications here that need careful consideration.
   
   ## Interaction Overview
   • **Drugs:** Warfarin + Aspirin + Ibuprofen
   • **Overall risk level:** Major
   • **Key interactions:** All three increase bleeding risk significantly when combined
   • **What could happen:** Serious bleeding complications, especially in stomach or brain
   • **What to do:** Don't take these together - contact your doctor immediately for safer pain relief alternatives

   User asks: "Is it safe to take metformin, lisinopril, and atorvastatin?"
   ## Multi-Drug Interaction Check
   Good news! These are commonly prescribed together and generally work well as a combination.
   
   ## Interaction Overview
   • **Drugs:** Metformin + Lisinopril + Atorvastatin
   • **Overall risk level:** No significant interactions
   • **Key interactions:** No major concerns between these medications
   • **What could happen:** Each works for its intended purpose without interfering with the others
   • **What to do:** Continue as prescribed, but monitor for individual side effects of each medication

7. SAFETY FIRST
   - Never give specific dosages or medical advice
   - Always include disclaimer about consulting healthcare providers
   - Base information on established medical knowledge
   - Clearly indicate when information is general vs. specific
   - For high-risk interactions, always recommend consulting healthcare providers
   - With multiple drugs, emphasize the importance of having one pharmacist review all medications

8. DISCLAIMER REQUIREMENT
   For single drug queries: "Hope this helps! For specific questions about your situation, your pharmacist or doctor is always your best resource for personalized advice."
   For interaction queries: "When in doubt, your pharmacist can give you the best advice for your specific medications!"
   For multiple drug interactions: "With multiple medications, it's especially important to have your pharmacist review everything together!"

IMPORTANT: Always maintain this friendly, helpful tone while prioritizing user safety above all else. Automatically detect and respond appropriately to both single drug queries and multi-drug interaction questions.
`;
  }
  
  /**
   * Creates a new model instance with the appropriate system prompt based on chat type
   */
  getModel(chatType = "general", modelName = "gemini-2.0-flash") {
    // Select the appropriate system prompt based on chat type
    let systemInstruction = this.systemPrompt; // Default enhanced system prompt
    
    if (chatType === "drugInteraction") {
      // Enhanced prompting for multiple drug interactions
      systemInstruction = this.systemPrompt + `

ADDITIONAL GUIDELINES FOR DEDICATED MULTI-DRUG INTERACTION CHECKS:

You're helping someone understand how multiple medications might interact. Be systematic and thorough while remaining clear and reassuring.

MULTI-DRUG ANALYSIS PROCESS:
1. Identify all drugs mentioned
2. Check each possible drug pair for interactions
3. Prioritize interactions by severity
4. Provide clear, actionable guidance

RESPONSE STRUCTURE:
## Multi-Drug Interaction Check
[1-2 sentences acknowledging their question about multiple medications]

## Interaction Overview
• **Drugs:** [List all drugs being analyzed]
• **Overall risk level:** [No interactions/Minor/Moderate/Major]
• **Key interactions:** [Most important interactions, prioritized by risk]
• **What could happen:** [Clear, non-scary explanation]
• **What to do:** [Practical, actionable advice prioritized by urgency]

FORMATTING:
- Keep responses under 120 words total for multiple drugs
- Be systematic but concise
- Always suggest pharmacist review for complex combinations
- Use bullet points on separate lines

## Disclaimer
Always end with: "With multiple medications, it's especially important to have your pharmacist review everything together!"`;
    } else if (chatType === "emergency") {
      // Chain of thought prompting for emergency assistance
      systemInstruction = this.systemPrompt + `

ADDITIONAL GUIDELINES FOR EMERGENCY ASSISTANCE:

You need to think through the situation step-by-step to provide the best help. Stay calm and guide them through this.

REASONING PROCESS (think through this first):
1. Is this life-threatening? (breathing problems, chest pain, severe bleeding, unconscious)
2. What's the most important action right now?
3. What can they do while getting help or waiting?
4. What safety reminders are crucial?

RESPONSE STRUCTURE:
## Emergency Assessment
[1-2 sentences acknowledging their situation with calm reassurance]

## Immediate Actions
• **Right now:** [Most important action - Call 911 if serious, or other immediate step]
• **While waiting:** [Helpful things they can do]
• **Watch for:** [Warning signs to monitor]
• **Remember:** [Key safety point or reassurance]

CRITICAL GUIDELINES:
- For life-threatening emergencies: ALWAYS start with "Call 911 immediately"
- For non-emergencies: Provide helpful guidance and suggest appropriate care
- Stay calm and reassuring while being clear about urgency
- Keep responses under 80 words total
- Use bullet points on separate lines

## Disclaimer
Always end with: "Trust your instincts - if something feels seriously wrong, don't hesitate to call 911."`;
    }
    
    return this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction,
      safetySettings: this.safetySettings,
      generationConfig: {
        temperature: 0.2, // Lower for more consistent, reliable responses
        topK: 30,        // Reduced for more focused responses
        topP: 0.85,      // Slightly lower for less verbose output
        maxOutputTokens: 250, // Increased slightly for multiple drug responses
      },
    });
  }
  
  /**
   * Detects if a user query is asking about drug interactions
   * @param {String} question - The user's question
   * @returns {Boolean} True if it's likely a drug interaction query
   */
  isInteractionQuery(question) {
    const interactionKeywords = [
      'together', 'with', 'and', 'plus', 'combination', 'interact', 
      'safe to take', 'can i take', 'taking both', 'mixing', 
      'combine', 'concurrent', 'simultaneously', 'at the same time'
    ];
    
    const questionLower = question.toLowerCase();
    
    // Check for interaction keywords
    const hasInteractionKeywords = interactionKeywords.some(keyword => 
      questionLower.includes(keyword)
    );
    
    // Check for multiple drug mentions (simple heuristic)
    const drugConnectors = [' and ', ' with ', ' plus ', ' & ', '+', ','];
    const hasMultipleDrugs = drugConnectors.some(connector => 
      questionLower.includes(connector)
    );
    
    return hasInteractionKeywords || hasMultipleDrugs;
  }
  
  /**
   * Processes a chat history and generates a response
   * @param {Array} history - Chat history in the expected format
   * @param {String} question - The current question
   * @param {Object} options - Additional options including chatType
   */
  async generateResponse(history, question, options = {}) {
    try {
      let chatType = options.chatType || "general";
      
      // Auto-detect interaction queries if using general chat type
      if (chatType === "general" && this.isInteractionQuery(question)) {
        console.log("Auto-detected drug interaction query");
        // Keep using general model but it will handle interaction format automatically
      }
      
      const model = this.getModel(chatType, options.modelName);
      
      // Format history for Gemini
      const formattedHistory = this.formatChatHistory(history);
      
      // Start a chat session with history
      const chat = model.startChat({
        history: formattedHistory,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 250,
        },
      });
      
      // Generate response
      const result = await chat.sendMessage(question);
      let response = result.response.text();
      
      // Apply post-processing to ensure formatting standards are met
      const isDetectedInteraction = this.isInteractionQuery(question);
      const effectiveChatType = isDetectedInteraction ? "drugInteraction" : chatType;
      response = this.formatResponse(response, effectiveChatType);
      
      return response;
    } catch (error) {
      console.error("Error generating response:", error);
      return "I'm sorry, I encountered an error while processing your request. Please try again later.";
    }
  }
  
  /**
   * Creates a specialized prompt for multiple drug interaction checks
   * @param {Array} drugs - Array of drug objects with drug information
   * @returns {String} Formatted prompt for drug interaction check
   */
  createMultiDrugInteractionPrompt(drugs = []) {
    if (!drugs || drugs.length === 0) {
      return "I need help checking for drug interactions, but no drugs were provided.";
    }
    
    const drugList = drugs
      .filter(drug => drug && (drug.name || drug.identifiedDrug))
      .map(drug => {
        const drugInfo = drug.identifiedDrug || drug;
        const name = drugInfo.name || "Unknown Drug";
        const ingredients = drugInfo.ingredients ? 
          ` (ingredients: ${drugInfo.ingredients.join(", ")})` : "";
        return name + ingredients;
      });
    
    if (drugList.length === 0) {
      return "I need help checking for drug interactions, but no valid drug information was found.";
    }
    
    if (drugList.length === 1) {
      return `Can you provide information about ${drugList[0]} and any important safety considerations?`;
    }
    
    const drugString = drugList.length === 2 ? 
      drugList.join(" and ") : 
      drugList.slice(0, -1).join(", ") + ", and " + drugList[drugList.length - 1];
    
    return `Can you check for interactions between ${drugString}? I want to make sure it's safe to take these ${drugList.length} medications together.`;
  }
  
  /**
   * Creates a specialized prompt for emergency assistance
   * @returns {String} Formatted prompt for emergency assistance
   */
  createEmergencyPrompt() {
    return `I need help with what seems like a medical emergency or urgent situation. Can you help me figure out what I should do right now?`;
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
   * Ensures response meets formatting standards and conversational tone
   */
  formatResponse(response, chatType) {
    // Remove excessive spacing
    let formattedResponse = response.trim().replace(/\n{3,}/g, '\n\n');
    
    // Ensure bullet points are on separate lines
    formattedResponse = formattedResponse.replace(/• /g, '\n• ').replace(/^\n/, '');
    
    // Clean up multiple newlines but preserve structure
    formattedResponse = formattedResponse.replace(/\n{3,}/g, '\n\n');
    
    // Check if response has proper disclaimer based on chat type
    const hasDisclaimer = formattedResponse.toLowerCase().includes("disclaimer") ||
                         formattedResponse.toLowerCase().includes("best resource") ||
                         formattedResponse.toLowerCase().includes("call 911") ||
                         formattedResponse.toLowerCase().includes("best advice for your specific") ||
                         formattedResponse.toLowerCase().includes("pharmacist review everything together");
    
    // Add appropriate disclaimer if missing
    if (!hasDisclaimer) {
      if (chatType === "drugInteraction") {
        formattedResponse += "\n\n## Disclaimer\nWith multiple medications, it's especially important to have your pharmacist review everything together!";
      } else if (chatType === "emergency") {
        formattedResponse += "\n\n## Disclaimer\nTrust your instincts - if something feels seriously wrong, don't hesitate to call 911.";
      } else {
        formattedResponse += "\n\n## Disclaimer\nHope this helps! For specific questions about your situation, your pharmacist or doctor is always your best resource for personalized advice.";
      }
    }
    
    return formattedResponse;
  }
  
  // Generates a summary of a chat conversation
  async generateSummary(chatContent) {
    try {
      const model = this.getModel();
      
      const promptText = `Please create a friendly summary of this conversation about medications or health topics. Focus on the key points discussed and any important safety information shared. Keep it conversational and helpful.
      
      Conversation: ${chatContent}`;
      
      const result = await model.generateContent(promptText);
      return result.response.text();
    } catch (error) {
      console.error("Error generating summary:", error);
      return "I couldn't create a summary right now. Please try again later!";
    }
  }
}

export default new GeminiService();