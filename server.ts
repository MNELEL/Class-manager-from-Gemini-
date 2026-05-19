import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

process.env.NODE_ENV = process.env.NODE_ENV || "production";
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let genAI: GoogleGenAI | null = null;
  const getGenAI = () => {
    if (!genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      genAI = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return genAI;
  };

  // API routes
  app.get("/api/health", (req, res) => {
    console.log("Health check pinged");
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });

  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction, model } = req.body;
      const ai = getGenAI();
      
      const response = await ai.models.generateContent({
        model: model || "gemini-1.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || "You are a helpful assistant for teachers."
        }
      });

      const text = response.text;
      res.json({ text });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/lesson-plan", async (req, res) => {
    try {
      const { topic, gradeLevel, duration, objectives } = req.body;
      const ai = getGenAI();

      const prompt = `
        Create a detailed lesson plan in Hebrew for the following:
        Topic: ${topic}
        Grade Level: ${gradeLevel}
        Duration: ${duration}
        Objectives: ${objectives || "Not specified"}

        The lesson plan should include:
        1. Title
        2. Objectives
        3. Materials Needed
        4. Introduction (Hook)
        5. Main Activity (Step by step)
        6. Conclusion/Summary
        7. Homework/Assessment

        Format the output in a clean Markdown structure.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt
      });

      const text = response.text;
      res.json({ text });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("[SERVER] Vite dev server could not be started, check if 'vite' is installed.");
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Started successfully`);
    console.log(`[SERVER] Listening on 0.0.0.0:${PORT}`);
    console.log(`[SERVER] Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(error => {
  console.error("CRITICAL: Failed to start server:", error);
  process.exit(1);
});
