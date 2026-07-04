import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

export async function spotifyRequest<T>(
  accessToken: string,
  url: string,
  method: 'get' | 'post' | 'put' = 'get',
  data?: unknown
): Promise<T> {
  const response = await axios({
    method,
    url: `https://api.spotify.com/v1${url}`,
    headers: { Authorization: `Bearer ${accessToken}` },
    data,
  });
  return response.data as T;
}
