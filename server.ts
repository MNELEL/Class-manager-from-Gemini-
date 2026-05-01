import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Initializing startServer...");
  const app = express();
  const PORT = 3000;

  console.log("__dirname:", __dirname);
  const distPath = path.join(__dirname, "dist");
  console.log("distPath:", distPath);

  // Use Vite as middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("Vite middleware failed:", e);
    }
  } else {
    console.log("Starting server in production mode...");
    // Serve static files in production
    if (fs.existsSync(distPath)) {
      console.log("distPath exists, setting up static middleware");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.error(`Production build not found at ${distPath}. Did you run 'npm run build'?`);
      // Define a basic route so Cloud Run doesn't fail health checks completely
      app.get("/", (req, res) => res.send("Production build not found."));
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server environment: ${process.env.NODE_ENV}`);
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
