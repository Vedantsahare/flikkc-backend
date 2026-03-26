import express from "express";
import OpenAI from "openai";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

const SYSTEM_PROMPT = `
You are Flikkc AI Guide.

Rules:
- Explain how Flikkc works.
- Help with prize pools, wallets, and rules.
- Do NOT predict winnings.
- Do NOT give financial or gambling advice.
- Keep responses clear and professional.
`;

router.post("/", authMiddleware, async (req, res) => {
  try {
    // ✅ Initialize OpenAI INSIDE handler (after env is loaded)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "AI not configured" });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    res.json({
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

export default router;
