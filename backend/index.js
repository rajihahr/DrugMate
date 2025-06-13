import express from "express"
import ImageKit from "imagekit";
import cors from "cors";
import mongoose from "mongoose";
import UserChats from "./models/userChats.js";
import Chat from "./models/chat.js";
import geminiService from "./services/geminiService.js";
import drugImageRoutes from "./routes/drugImageRoutes.js";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node"

const port = process.env.PORT || 3000;
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));

app.use(express.json());

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log("Connected to MongoDB");
  } catch(err){
    console.log("MongoDB connection error:", err);
  }
};

const imagekit = new ImageKit({
    urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
    publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
    privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
  });
  
app.get("/api/upload", (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
});

app.post("/api/chats", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  const { text, useGemini, chatType, drugCheck, isEmergency } = req.body;
  
  try {
    // Determine initial message and title based on chat type
    let initialMessage = text || "New Chat";
    let chatTitle = text ? text.substring(0, 40) : "New Chat";
    
    // If using GeminiService for drug interactions
    if (useGemini && chatType === "drugInteraction" && drugCheck) {
      console.log("Creating drug interaction chat with data:", drugCheck);
      
      // Check if we have the new multiple drugs format
      if (drugCheck.drugs && Array.isArray(drugCheck.drugs)) {
        // Use the new multi-drug prompt method
        initialMessage = geminiService.createMultiDrugInteractionPrompt(drugCheck.drugs);
        chatTitle = `Drug Interaction Check (${drugCheck.drugCount || drugCheck.drugs.length} drugs)`;
      } else {
        // Fallback to legacy format for compatibility
        initialMessage = geminiService.createDrugInteractionPrompt(
          drugCheck.drug1Info, 
          drugCheck.drug2Info
        );
        chatTitle = "Drug Interaction Check";
      }
    }
    
    // If using GeminiService for emergency assistance
    if (useGemini && chatType === "emergency") {
      // Generate the emergency prompt using GeminiService
      initialMessage = geminiService.createEmergencyPrompt();
      chatTitle = "Emergency Assistance";
    }
    
    console.log("Creating chat with initial message:", initialMessage);
    
    // CREATE A NEW CHAT 
    const newChat = new Chat({
      userId: userId,
      history: [{role: "user", parts: [{text: initialMessage}]}],
      chatType: chatType || "general", // Store chat type for future reference
      ...(drugCheck && { drugCheck }), // Store drug check info if provided
      ...(isEmergency && { isEmergency: true }) // Flag if it's an emergency chat
    });

    const savedChat = await newChat.save();
    console.log("Chat saved with ID:", savedChat._id);

    // CHECK IF THE USERCHATS EXISTS
    const userChats = await UserChats.find({userId: userId});

    if(!userChats.length){
      const newUserChats = new UserChats ({
        userId: userId,
        chats: [
          {
            _id: savedChat.id,
            title: chatTitle,
          },
        ],
      });

      await newUserChats.save();
      res.status(201).send(savedChat._id);
    } else {
      //IF EXISTS, PUSH CHAT TO EXISTING ARRAY
      await UserChats.updateOne({userId:userId}, {
        $push: {
          chats: {
            _id: savedChat._id,
            title: chatTitle,
          },
        },
      });
      res.status(201).send(savedChat._id);
    }
  } catch(err){
    console.error("Error creating chat:", err);
    res.status(500).send("Error creating chat!");
  }
});

app.delete("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  const chatId = req.params.id;

  try {
    // Delete the chat document
    await Chat.deleteOne({ _id: chatId, userId });
    
    // Remove the chat reference from UserChats
    await UserChats.updateOne(
      { userId },
      { $pull: { chats: { _id: chatId } } }
    );
    
    res.status(200).send({ message: "Chat deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error deleting chat!");
  }
});

app.post("/api/generate", ClerkExpressRequireAuth(), async (req, res) => {
  const { chatId, message, img, useGemini, chatType, isInitialResponse } = req.body;
  const userId = req.auth.userId;
  
  try {
    // Get the chat history
    const chat = await Chat.findOne({ _id: chatId, userId });
    
    if (!chat) {
      return res.status(404).send("Chat not found");
    }
    
    // Determine which chat type to use
    const effectiveChatType = chatType || chat.chatType || "general";
    
    console.log("Generating response for chat type:", effectiveChatType);
    
    // Generate response using our Gemini service with the appropriate chat type
    const aiResponse = await geminiService.generateResponse(
      chat.history, 
      message,
      { 
        maxTokens: 1024,
        chatType: effectiveChatType  // Pass chat type to GeminiService
      }
    );
    
    // Update chat history with the AI response
    // If this is an initial response, don't add the user message again (it's already there)
    let newItems;
    
    if (isInitialResponse) {
      // Only add the AI response, user message is already in history
      newItems = [
        { role: "model", parts: [{ text: aiResponse }] }
      ];
    } else {
      // Add both user message and AI response (normal flow)
      newItems = [
        { role: "user", parts: [{ text: message }], ...(img && { img }) },
        { role: "model", parts: [{ text: aiResponse }] }
      ];
    }
    
    await Chat.updateOne(
      { _id: chatId, userId },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      }
    );
    
    res.status(200).json({ response: aiResponse });
  } catch (err) {
    console.error("Error generating response:", err);
    res.status(500).send("Error generating response");
  }
});

app.get("/api/chats/:id/summarize", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  const chatId = req.params.id;

  try {
    // Get the chat data
    const chat = await Chat.findOne({ _id: chatId, userId });
    
    if (!chat) {
      return res.status(404).send("Chat not found");
    }

    // Extract the content from chat history
    const chatContent = chat.history.map(item => {
      const role = item.role === "user" ? "User" : "AI";
      const text = item.parts[0]?.text || "";
      return `${role}: ${text}`;
    }).join("\n\n");

    // Get the chat title
    const chatTitle = chat.history[0]?.parts[0]?.text?.substring(0, 40) || "Chat Summary";

    // Generate summary using our Gemini service
    const summary = await geminiService.generateSummary(chatContent);

    res.status(200).send({
      title: chatTitle,
      originalContent: chatContent,
      summary: summary,
      date: new Date().toLocaleDateString(),
      chatId: chatId
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error generating summary!");
  }
});

app.get("/api/userchats", ClerkExpressRequireAuth(), async (req,res) => {
  const userId = req.auth.userId;

  try {
    const userChats = await UserChats.find({userId});
    if (!userChats.length) {
      return res.status(404).send("No chats found for this user");
    }
    res.status(200).send(userChats[0].chats);
  } catch (err) {  // Add the error parameter here
    console.log(err);
    res.status(500).send("Error fetching user chats!");
  }
});

app.get("/api/chats/:id", ClerkExpressRequireAuth(), async (req,res) => {
  const userId = req.auth.userId;

  try {
    const chat = await Chat.findOne({ _id:req.params.id, userId});
    if (!chat) {
      return res.status(404).send("Chat not found");
    }
    res.status(200).send(chat);
  } catch (err) {  // Add the error parameter here
    console.log(err);
    res.status(500).send("Error fetching chat!");
  }
});

app.put("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  const { question, answer, img } = req.body;

  const newItems = [
    ...(question
      ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
      : []),
    { role: "model", parts: [{ text: answer }] },
  ];

  try {
    const updatedChat = await Chat.updateOne(
      { _id: req.params.id, userId },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      }
    );
    res.status(200).send(updatedChat);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error adding conversation!");
  }
});

app.use("/api", drugImageRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(401).send("Unauthenticate")
});

app.listen(port,() => {
  connect();
  console.log("Server running on 3000")
});