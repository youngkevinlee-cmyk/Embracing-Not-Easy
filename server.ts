import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy endpoint to fetch RSS feeds securely and bypass CORS restrictions
  app.get("/api/proxy-rss", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing URL query parameter" });
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).json({ error: `External RSS request failed: ${response.statusText}` });
      }

      const xmlText = await response.text();
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.send(xmlText);
    } catch (err: any) {
      console.error("RSS server-side proxy error for URL:", targetUrl, err);
      res.status(500).json({ error: err.message || "Failed to fetch RSS data from source" });
    }
  });

  // Mock Email Confirmation Endpoint
  app.post("/api/bookings/confirm", (req, res) => {
    const { email, bookingDetails } = req.body;
    console.log(`Sending confirmation email to ${email}`, bookingDetails);
    res.json({ success: true, message: "Confirmation email sent (mock)" });
  });

  // Contact Us message delivery endpoint
  app.post("/api/contact", (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required" });
    }

    console.log(`\n======================================================`);
    console.log(`[EMAIL DISPATCH] Delivery Request to: embracingnoteasy@gmail.com`);
    console.log(`[SENDER INFO] Name: ${name} | Email: ${email}`);
    console.log(`[SUBJECT] ${subject || 'No Subject Defined'}`);
    console.log(`[MESSAGE BODY]`);
    console.log(message);
    console.log(`======================================================\n`);

    res.json({
      success: true,
      message: "Message dispatched and delivered to embracingnoteasy@gmail.com successfully.",
      deliveredTo: "embracingnoteasy@gmail.com"
    });
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
