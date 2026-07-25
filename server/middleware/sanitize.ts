import type { Request, Response, NextFunction } from "express";
import xss from "xss";

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return xss(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object" && !(value instanceof Date) && !(value instanceof Buffer)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeValue(req.query) as Record<string, string>;
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeValue(req.params) as Record<string, string>;
  }
  next();
}
