import { spawn } from "child_process";

/**
 * Obtiene el mejor movimiento de Stockfish dado un FEN
 * @param fen - estado actual del tablero
 * @param depth - profundidad de análisis (mayor = más fuerte pero más lento)
 */
export function getBestMove(fen: string, depth: number = 10): Promise<string> {
  return new Promise((resolve, reject) => {
    // usa el binario nativo instalado en el sistema
    const stockfish = spawn("stockfish");

    let bestMove: string | null = null;

    stockfish.stdout.on("data", (data: Buffer) => {
      const output = data.toString();
      console.log("STOCKFISH OUTPUT:", output);

      if (output.includes("bestmove")) {
        const match = output.match(/bestmove\s+(\S+)/);
        if (match) {
          bestMove = match[1];
          stockfish.kill();
          resolve(bestMove);
        }
      }
    });

    stockfish.stderr.on("data", (data: Buffer) => {
      console.error("Stockfish error:", data.toString());
    });

    stockfish.on("close", () => {
      if (!bestMove) reject(new Error("Stockfish no retornó movimiento"));
    });

    stockfish.stdin.write("uci\n");
    stockfish.stdin.write(`position fen ${fen}\n`);
    stockfish.stdin.write(`go depth ${depth}\n`);
  });
}