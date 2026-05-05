import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import gamesRouter from "./routes/games";
import authRouter from "./routes/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/games", gamesRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});