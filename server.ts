import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenerativeAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini AI Endpoint
  app.post("/api/ai/arrange", async (req, res) => {
    try {
      const { context, prompt, weights } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const systemPrompt = `You are a professional pedagogical assistant helping a teacher arrange a classroom.
Context: ${context}
User Request: ${prompt}
Preference Weights (1-10 scale): ${JSON.stringify(weights || { preferred: 8, forbidden: 10, separateFrom: 7 })}

Constraints to consider:
- 'preferred': Students who should sit near each other.
- 'forbidden': Students who should NOT sit immediately adjacent.
- 'separateFrom': Students who should be as far as possible from each other.
- 'frontPrefer': Preference for sitting in the first two rows.
- 'backPrefer' / 'tall': Preference for sitting in the last two rows.
- 'cornerPrefer': Preference for sitting in any of the four corners of the room.

Important: Return your response in Hebrew. 
Analyze the situation first, then provide a suggestion.
If asked to rearrange the class, include a JSON block at the end of your response in this exact format:
{"action":"arrange","grid":[studentId1, studentId2, null, ...]} 
The grid array must match the total number of cells in the classroom.
Use null for empty desks or hidden desks.`;

      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();

      res.json({ text });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to process AI request" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
