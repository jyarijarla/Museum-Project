import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

// middleware
// Use a configurable client origin for CORS when deployed. If `CLIENT_ORIGIN`
// is not set, allow all origins (useful for local development).
const clientOrigin = process.env.CLIENT_ORIGIN || null;
if (clientOrigin) {
  app.use(cors({
    origin: (origin, cb) => {
      // allow requests with no origin (e.g. curl, server-to-server)
      if (!origin) return cb(null, true);
      return cb(null, origin === clientOrigin);
    },
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','OPTIONS']
  }));
} else {
  // permissive for dev
  app.use(cors());
}

app.use(express.json());

// routes
app.use("/api", authRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});