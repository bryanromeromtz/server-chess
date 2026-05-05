import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// extender el tipo Request para agregar el usuario decodificado
export interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  // el token viene en el header Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token requerido" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    // verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
      email: string;
    };

    // agregar el usuario al request para usarlo en las rutas
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}