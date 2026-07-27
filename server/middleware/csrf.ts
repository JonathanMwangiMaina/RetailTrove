import { csrfSync } from "csrf-sync";
import type { Request, Response } from "express";

const { generateToken, csrfSynchronisedProtection } = csrfSync({
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getTokenFromRequest: (req: Request) => {
    return (req.headers["x-csrf-token"] as string) || "";
  },
});

export { generateToken, csrfSynchronisedProtection };

export function handleCsrfToken(req: Request, res: Response) {
  const token = generateToken(req);
  res.json({ token });
}
