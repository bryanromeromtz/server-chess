import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import gamesRouter from "./routes/games";
import authRouter from "./routes/auth";
import logger from "./logger";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// rate limiter general — 100 peticiones por 15 minutos por IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Demasiadas peticiones, intenta más tarde" },
  standardHeaders: true,
  legacyHeaders: false,
});

// rate limiter estricto para auth — 10 intentos por 15 minutos
// evita ataques de fuerza bruta contra el login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos, intenta más tarde" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use(generalLimiter);

// middleware para loggear todas las peticiones
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

app.get("/health", (req, res) => {
  logger.info("Health check");
  res.json({ status: "ok" });
});

app.use("/auth", authLimiter, authRouter);
app.use("/games", gamesRouter);

// middleware para loggear errores
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});