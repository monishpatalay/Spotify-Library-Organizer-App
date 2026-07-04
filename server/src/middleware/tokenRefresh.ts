import { Request, Response, NextFunction } from 'express';

// Middleware that extracts the Bearer token from the Authorization header
// and attaches it to req for downstream route handlers.
export function extractToken(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  (req as any).accessToken = auth.slice(7);
  next();
}
