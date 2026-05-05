import { Router, Response } from "express";
import { PrismaClient } from "../generated/prisma";
import { Chess } from "chess.js";
import { getBestMove } from "../stockfish";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// todas las rutas requieren autenticación
router.use(authMiddleware);

// crear partida
router.post("/", async (req: AuthRequest, res: Response) => {
  const game = await prisma.game.create({
    data: {
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      status: "active",
      userId: req.user!.id,
    },
  });
  res.json(game);
});

// obtener partida
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const game = await prisma.game.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!game) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  // solo el dueño puede ver su partida
  if (game.userId !== req.user!.id) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  res.json(game);
});

// hacer movimiento
router.post("/:id/move", async (req: AuthRequest, res: Response) => {
  const { from, to, promotion } = req.body;

  if (!from || !to) {
    res.status(400).json({ error: "Se requieren los campos from y to" });
    return;
  }

  const game = await prisma.game.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!game) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  if (game.userId !== req.user!.id) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  if (game.status !== "active") {
    res.status(400).json({ error: "La partida ya terminó" });
    return;
  }

  const chess = new Chess(game.fen);

  try {
    chess.move({ from, to, promotion: promotion ?? "q" });
  } catch {
    res.status(400).json({ error: "Movimiento inválido" });
    return;
  }

  let status = "active";
  if (chess.isCheckmate()) status = "checkmate";
  else if (chess.isDraw()) status = "draw";

  const updatedGame = await prisma.game.update({
    where: { id: Number(req.params.id) },
    data: { fen: chess.fen(), status },
  });

  res.json(updatedGame);
});

// movimiento de la IA
router.post("/:id/ai-move", async (req: AuthRequest, res: Response) => {
  const game = await prisma.game.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!game) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  if (game.userId !== req.user!.id) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  if (game.status !== "active") {
    res.status(400).json({ error: "La partida ya terminó" });
    return;
  }

  const bestMove = await getBestMove(game.fen);
  const from = bestMove.slice(0, 2);
  const to = bestMove.slice(2, 4);
  const promotion = bestMove.length > 4 ? bestMove.slice(4) : "q";

  const chess = new Chess(game.fen);

  try {
    chess.move({ from, to, promotion });
  } catch {
    res.status(400).json({ error: "Movimiento inválido de Stockfish" });
    return;
  }

  let status = "active";
  if (chess.isCheckmate()) status = "checkmate";
  else if (chess.isDraw()) status = "draw";

  const updatedGame = await prisma.game.update({
    where: { id: Number(req.params.id) },
    data: { fen: chess.fen(), status },
  });

  res.json({ ...updatedGame, move: bestMove });
});

export default router;