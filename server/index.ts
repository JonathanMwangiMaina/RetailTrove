import express from "express";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Storage Bootstrap Initialization ─────────────────────────────────────────
async function bootstrapStorage(): Promise<void> {
  try {
    // Safe optional chaining execution
    await storage.ensureBanner?.();
    await storage.ensureDefaultAdmin?.();
    await storage.ensureSiteContent?.();
    await storage.ensureSiteSettings?.();
    await storage.ensureDefaultFaqs?.();
  } catch (error) {
    console.error("Failed to execute storage bootstrap methods:", error);
  }
}

(async () => {
  // Run bootstrap tasks during startup
  await bootstrapStorage();

  const server = await registerRoutes(app);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();
