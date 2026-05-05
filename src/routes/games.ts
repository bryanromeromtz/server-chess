import { Router, Request, Response } from "express";
import { PrismaClient } from "../generated/prisma";
import { Chess } from "chess.js";
import { getBestMove } from "../stockfish";

const router = Router();
const prisma = new PrismaClient();

// crear partida
router.post("/", async (req: Request, res: Response) => {
  const game = await prisma.game.create({
    data: {
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      status: "active",
    },
  });
  res.json(game);
});

// obtener partida
router.get("/:id", async (req: Request, res: Response) => {
  const game = await prisma.game.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!game) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  res.json(game);
});

// hacer movimiento
router.post("/:id/move", async (req: Request, res: Response) => {
  const { from, to, promotion } = req.body;

  // validar que vengan los campos necesarios
  if (!from || !to) {
    res.status(400).json({ error: "Se requieren los campos from y to" });
    return;
  }

  // cargar la partida de la BD
  const game = await prisma.game.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!game) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  if (game.status !== "active") {
    res.status(400).json({ error: "La partida ya terminó" });
    return;
  }

  // validar el movimiento con chess.js
  const chess = new Chess(game.fen);

  try {
    chess.move({ from, to, promotion: promotion ?? "q" });
  } catch {
    res.status(400).json({ error: "Movimiento inválido" });
    return;
  }

  // determinar si la partida terminó
  let status = "active";
  if (chess.isCheckmate()) status = "checkmate";
  else if (chess.isDraw()) status = "draw";

  // guardar el nuevo estado en la BD
  const updatedGame = await prisma.game.update({
    where: { id: Number(req.params.id) },
    data: {
      fen: chess.fen(),
      status,
    },
  });

  res.json(updatedGame);
});

router.post("/:id/ai-move", async (req: Request, res: Response) => {
  const game = await prisma.game.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!game) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  if (game.status !== "active") {
    res.status(400).json({ error: "La partida ya terminó" });
    return;
  }

  // pedir el mejor movimiento a Stockfish
  const bestMove = await getBestMove(game.fen);

  // bestMove viene en formato "e7e5" — from + to
  const from = bestMove.slice(0, 2);
  const to = bestMove.slice(2, 4);
  const promotion = bestMove.length > 4 ? bestMove.slice(4) : "q";

  // aplicar el movimiento con chess.js para validar y obtener nuevo FEN
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
    data: {
      fen: chess.fen(),
      status,
    },
  });

  res.json({ ...updatedGame, move: bestMove });
});

export default router;
