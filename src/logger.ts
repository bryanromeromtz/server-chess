import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

// formato personalizado para los logs
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }), // captura el stack trace de errores
    logFormat
  ),
  transports: [
    // logs en consola
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
    }),
    // todos los logs en un archivo
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB máximo por archivo
      maxFiles: 5,      // máximo 5 archivos de log
    }),
    // solo errores en un archivo separado
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

export default logger;