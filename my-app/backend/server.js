import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});