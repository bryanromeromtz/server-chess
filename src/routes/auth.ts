import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../generated/prisma";

const router = Router();
const prisma = new PrismaClient();

// registrar usuario
router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email y password son requeridos" });
    return;
  }

  // verificar si el email ya existe
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(400).json({ error: "El email ya está registrado" });
    return;
  }

  // hashear la contraseña — nunca guardar en texto plano
  // el 10 es el número de rondas de salt, más alto = más seguro pero más lento
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });

  res.status(201).json({ id: user.id, email: user.email });
});

// login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email y password son requeridos" });
    return;
  }

  // buscar usuario por email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  // comparar password con el hash guardado
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  // generar JWT con el id y email del usuario
  // el token expira en 7 días
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  res.json({ token, user: { id: user.id, email: user.email } });
});

export default router;