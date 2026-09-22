import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DB_PATH = path.join(process.cwd(), "database.json");
  const BACKUPS_DIR = path.join(process.cwd(), "backups");

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Get database data
  app.get("/api/data", (_req, res) => {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, "utf-8");
        const data = JSON.parse(raw);
        return res.json(data);
      }
      return res.json({
        globalSettings: {
          adminSchool: "إدارة شرق كفر الشيخ التعليمية - مدرسة الشهيد نجيب محي الشناوي للتعليم الأساسي بدقميرة",
          teacher: "مازن فوزي محمد على بدوي",
          subject: "لغة انجليزية",
          year: "2026-2027",
          pageSize: 25,
          lastTerm: "الاول",
          lastClass: "اول 1",
          customClasses: [],
        },
        classesData: {},
      });
    } catch (err: any) {
      console.error("Error reading database.json:", err);
      return res.status(500).json({ error: "Failed to read database" });
    }
  });

  // Save database data
  app.post("/api/data", (req, res) => {
    try {
      const data = req.body;
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Error writing database.json:", err);
      return res.status(500).json({ error: "Failed to save database" });
    }
  });

  // Create backup
  app.post("/api/backup", (req, res) => {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
      const data = req.body && Object.keys(req.body).length > 0
        ? req.body
        : fs.existsSync(DB_PATH)
          ? JSON.parse(fs.readFileSync(DB_PATH, "utf-8"))
          : {};

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFilename = `EnglishGradingBackup_${timestamp}.json`;
      const backupFilePath = path.join(BACKUPS_DIR, backupFilename);
      fs.writeFileSync(backupFilePath, JSON.stringify(data, null, 2), "utf-8");

      return res.json({ success: true, filename: backupFilename });
    } catch (err: any) {
      console.error("Error creating backup:", err);
      return res.status(500).json({ error: "Failed to create backup" });
    }
  });

  // Open folder action
  app.post("/api/open-folder", (_req, res) => {
    return res.json({ success: true, folder: process.cwd() });
  });

  // Exit application
  app.post("/api/exit", (_req, res) => {
    res.json({ success: true });
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
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
