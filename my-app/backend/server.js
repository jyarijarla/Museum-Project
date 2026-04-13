import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import { db } from "./db.js";

dotenv.config();

const app = express();

// ── Run any pending schema migrations on startup ──────────────────────────────
async function runMigrations() {
  try {
    // Check if Status column exists on TicketPurchase before trying to add it
    const [cols] = await db.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'TicketPurchase'
         AND COLUMN_NAME = 'Status'`
    );
    if (cols.length === 0) {
      await db.execute(
        `ALTER TABLE TicketPurchase
           ADD COLUMN Status VARCHAR(20) NOT NULL DEFAULT 'Active'`
      );
      console.log('[migration] added Status column to TicketPurchase');
    }
  } catch (err) {
    console.warn('[migration] warning:', err.message);
  }
  console.log('[migration] schema check complete');
}

// middleware
// CLIENT_ORIGIN can be a comma-separated list of allowed origins.
// If not set, all origins are allowed (local dev).
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map(o => o.trim())
  : null;

app.use(cors({
  origin: (origin, cb) => {
    // allow server-to-server / curl (no origin header)
    if (!origin) return cb(null, true);
    // if no whitelist configured, allow everything (dev)
    if (!allowedOrigins) return cb(null, true);
    // allow any vercel.app subdomain for preview deployments
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS']
}));

app.use(express.json());

// routes
app.use("/api", authRoutes);

const PORT = process.env.PORT || 4000;

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});