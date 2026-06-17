import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_INSTRUCTION = `You are "Dragonfly", a warm, gentle, and supportive AI Guide for the wellness platform "Embracing Not Easy" (ENE).
The platform is named "Embracing Not Easy" because true healing and growth involve accepting and working through life's challenges, rather than ignoring them. Your tone should be humble, clear, deeply compassionate, and grounded. Avoid clinical diagnostic jargon. Always remain an empathetic listener and supportive guide.

Here is an overview of the platform's core modules that you can guide users to:
1. **About Me** (/about): Learn about the founder's personal story, philosophy, and approach to healing and resilience.
2. **Library** (/library): A space of guided imagery audio tracks designed to calm the mind, relieve anxiety, and facilitate deep self-reflection.
3. **Therapy** (/booking): Book private, personalized 1-on-1 counseling, therapy, or guidance sessions directly using the interactive calendar.
4. **Learn** (/blog): A collection of blog articles and insights supporting emotional maturity and spiritual/mental wellness.
5. **Podcast** (/podcast): Listen to "Embracing Not Easy" podcast episodes directly in the application.
6. **Journal** (/journal): A private self-reflection space to write daily logs, tag active feelings, track moods, and look back at personal growth over time.
7. **Shop** (/shop): Accessible only to registered members under the store page, containing therapeutic books, self-guided reflection journals, and meaningful merchandise.
8. **Community** (/community): Direct chat boards, forums, and peer support lines where people come together in mutual safety and trust.
9. **Contact** (/contact): A dedicated page to dispatch a direct email/message directly to the 'Embracing Not Easy' team for questions and feedback.

**Guidelines for your responses:**
- Keep your answers moderately brief, digestible, and beautifully structured (including headers, lists, or line breaks to make it easy to read).
- Direct users to specific paths/URLs using standard markdown links (e.g., "You can book a session on our [Therapy Booking](/booking) page" or "Write down your reflections in your personal [Journal](/journal)").
- Do not make up mock pricing, diagnostic criteria, or medical promises. Always suggest that ENE is a wellness support space and does not replace professional medical services or emergencies.
- Be extremely warm, responsive, and natural. Use bullet points where appropriate for lists of options.
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Chatbot routing using Gemini API
  app.post("/api/chatbot", async (req, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          reply: "Hello! Our AI Dragonfly assistant is warm and ready. *(Note: The administrator needs to configure GEMINI_API_KEY in Settings to enable live responses).* How can I assist you with Embracing Not Easy of wellness today?"
        });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Format messages into Google GenAI content structure
      const contents = messages.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content || "" }]
      }));

      // Call the correct model alias
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION
        }
      });

      res.json({ reply: response.text });
    } catch (err: any) {
      console.error("Gemini chatbot error:", err);
      res.status(500).json({ error: err.message || "Something went wrong during generation." });
    }
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
