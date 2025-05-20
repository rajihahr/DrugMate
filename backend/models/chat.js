// In your models/chat.js file

import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    history: {
      type: [
        {
          role: {
            type: String,
            enum: ["user", "model"],
            required: true,
          },
          parts: [
            {
              text: {
                type: String,
                required: true,
              },
            },
          ],
          img: {
            type: String,
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    // New fields for specialized chat types
    chatType: {
      type: String,
      enum: ["general", "drugInteraction", "emergency"],
      default: "general"
    },
    drugCheck: {
      drug1Image: String,
      drug2Image: String,
      drug1Info: Object,
      drug2Info: Object
    },
    isEmergency: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);